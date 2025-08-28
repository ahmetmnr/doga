# OpenAI Realtime API Araştırma Bulguları

## Temel Bilgiler

### OpenAI Realtime API Nedir?
- Düşük gecikme süreli, multimodal etkileşimler sağlayan API
- Konuşma-konuşma (speech-to-speech) deneyimleri ve gerçek zamanlı transkripsiyon
- GPT-4o ve GPT-4o mini gibi natively multimodal modellerle çalışır

### Temel Özellikler:
- Gerçek zamanlı **metin** ve **ses** işleme
- Konuşmalar sırasında **fonksiyon çağırma**
- **Konuşma üretimi** (asistan geri konuşma)
- **Streaming transkripsiyon** (GPT-4o Transcribe ve GPT-4o mini Transcribe ile)

### Kullanım Alanları:
- Gerçek zamanlı, konuşma-konuşma sohbet AI'ı
- Canlı transkripsiyon uygulamaları
- Ses ajanları (telefon aramaları, mobil uygulamalar vb.)

## Bağlantı Yöntemleri

### 1. WebRTC
- İstemci tarafı uygulamalar için ideal (web uygulaması gibi)

### 2. WebSockets
- Sunucu-sunucu uygulamaları için harika
- Backend'den veya telefon üzerinden ses ajanı oluştururken
- Tarayıcı ve mobil istemciler için

## Geleneksel STT-LLM-TTS vs Realtime API

### Geleneksel Yaklaşım:
Mikrofon → STT → LLM → TTS → Hoparlör
- STT: konuşma → metin dönüştürme
- LLM işleme veya AI Ajanları
- TTS: metin → konuşma dönüştürme

### Realtime API:
Mikrofon → Realtime API → Hoparlör
- Kullanıcının konuşmasını canlı transkript eder (STT gibi)
- Anlamı anlar
- Dinamik yanıt üretir (metin ve/veya fonksiyon çağrıları)
- Gerçek zamanlı sentezlenmiş konuşmayı geri akışla gönderir (TTS gibi)
- Tümü tek bir sürekli etkileşim içinde gerçekleşir

## Fiyatlandırma
- Yaklaşık $0.06 per dakika ses girişi
- Yaklaşık $0.24 per dakika ses çıkışı

## Event Lifecycle (Olay Yaşam Döngüsü)

### Temel Event'ler:
1. **conversation.item.input_audio_transcription.completed** - Kullanıcı ses transkripti tamamlandı
2. **response.audio.delta** - Asistan ses akışı (chunk-by-chunk)
3. **response.audio_transcript.delta** - Canlı altyazılar için
4. **response.audio_transcript.done** - Asistan'ın tüm transkripti
5. **response.done** - Yanıt tamamlandı, yeni kullanıcı girişi kabul edilebilir

### Workflow Örneği:
```
Kullanıcı: "Hello"
Asistan: "Hi there! Thanks for joining me today. I'm exploring …."

Akış: 
"Kullanıcı sesi akışla gönderildi" → 
"API kullanıcının konuşması için transkripsiyon üretti" → 
"API asistan sesini (raw PCM16 data olarak) transkriptler ve yanıt işaretleyicileriyle birlikte istemciye geri akışla gönderdi"
```

## Teknik Detaylar

### Audio Streaming:
- Asistan'ın yanıt sesi chunk-by-chunk olarak `response.audio.delta` ile akışla gönderilir
- Bu chunk'ları birleştirip düzgün çalmak gerekir
- PCM16'yı WAV'a dönüştürüp frontend istemci websocket'ine bytes gönderme

### WebSocket Protokolü:
- Full-duplex, gerçek zamanlı iletişim
- Tek, uzun ömürlü bağlantı üzerinden
- Geleneksel HTTP request-response modelinin aksine
- Sunucu istediği zaman istemciye veri gönderebilir

## Referanslar ve Kaynaklar:
- https://platform.openai.com/docs/guides/realtime
- https://platform.openai.com/docs/guides/realtime-conversations
- https://platform.openai.com/docs/api-reference/realtime-client-events
- https://medium.com/@shmilysyg/openai-realtime-api-practical-guide-with-real-case-example-1-2-923e19afcaf2



## Güvenlik ve Altyapı Zorlukları

### Üç Ana Sorun:
1. **User-facing credentials** - Kullanıcıya yönelik kimlik bilgileri
2. **Logging** - Günlükleme
3. **Evaluations** - Değerlendirmeler

### WebSocket ve Serverless Sorunları:
- Realtime API WebSocket üzerine kurulu
- Vercel veya AWS Lambda gibi serverless backend'ler WebSocket desteklemiyor
- API şu anda client-side authentication eksik
- Doğrudan tarayıcıdan API'ye bağlanmak güvensiz

### Geleneksel Çözüm - Relay Server:
- Ayrı, uzun süre çalışan Node.js relay server kurulumu gerekli
- Relay server OpenAI API key'i tutar
- Tüm Realtime API çağrıları relay üzerinden geçmeli
- Mimariyi karmaşıklaştırır
- Ölçeklendirme sorunları

### Braintrust AI Proxy Çözümü:

#### Avantajlar:
- OpenAI API key'i backend'e gömme gereksinimi yok
- Serverless platform kullanımına devam edebilme
- Güvenli kimlik bilgisi yönetimi
- Geçici kimlik bilgileri (temporary credentials)
- Otomatik logging desteği
- Multimodal içerik logging'i

#### Kod Örneği:
```typescript
import { RealtimeClient } from "@openai/realtime-api-beta";

const LOCAL_RELAY_SERVER_URL =
  process.env.REACT_APP_LOCAL_RELAY_SERVER_URL ||
  "https://braintrustproxy.com/v1/realtime";
const apiKey = process.env.OPENAI_API_KEY;

const client = new RealtimeClient({
  url: LOCAL_RELAY_SERVER_URL || undefined,
  apiKey,
  dangerouslyAllowAPIKeyInBrowser: true,
});
```

#### Geçici Kimlik Bilgisi Oluşturma:
```typescript
const PROXY_URL =
  process.env.BRAINTRUST_PROXY_URL || "https://braintrustproxy.com/v1";
const BRAINTRUST_API_KEY = process.env.BRAINTRUST_API_KEY;

async function main() {
  const response = await fetch(`${PROXY_URL}/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BRAINTRUST_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview-2024-10-01",
      ttl_seconds: 60 * 10, // 10 dakika
      logging: {
        project_name: "My project",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to request temporary credentials: ${error}`);
  }

  const { key: tempCredential } = await response.json();
  console.log(`Authorization: Bearer ${tempCredential}`);
}
```

### Logging Özellikleri:
- Ses, metin, yapılandırılmış veri ve görüntü logging'i
- Session kapandığında log hazır
- Her LLM ve tool call ayrı span içinde
- Multimodal içerik attachment olarak görüntülenebilir
- UI'dan çıkmadan LLM call'ları incelenebilir


## Azure OpenAI Realtime API

### Desteklenen Modeller:
- `gpt-4o-realtime-preview` (version `2024-12-17`)
- `gpt-4o-mini-realtime-preview` (version `2024-12-17`)
- Global deployment'lar için mevcut

### API Desteği:
- İlk destek: API version `2024-10-01-preview` (retired)
- Güncel: `2025-04-01-preview` (en son özellikler için)

### Bağlantı Yöntemleri:

#### WebRTC (Önerilen):
- Client-side uygulamalar için (web app, mobile app)
- Düşük gecikme süreli, gerçek zamanlı ses akışı için tasarlanmış
- Çoğu kullanım durumu için en iyi seçim

#### WebSocket:
- Server-to-server senaryolar için
- Düşük gecikme süresi gereksinim olmadığında

### Azure AI Foundry Portal Kullanımı:

#### Model Deployment:
1. Azure AI Foundry portal'a git
2. Proje oluştur veya seç
3. **Models + endpoints** > **My assets** seç
4. **+ Deploy model** > **Deploy base model**
5. `gpt-4o-mini-realtime-preview` ara ve seç
6. **Confirm** ve **Deploy**

#### Audio Playground Kullanımı:
1. Azure AI Foundry portal'da projeyi seç
2. **Playgrounds** > **Audio playground** > **Try the Audio playground**
3. Deployed model'i **Deployment** dropdown'dan seç
4. Model talimatlarını düzenle (isteğe bağlı)
5. Threshold, prefix padding, silence duration ayarları
6. **Start listening** ile session başlat
7. Mikrofona konuş
8. İstediğin zaman konuşarak kesebilirsin
9. **Stop listening** ile bitir

### Önemli Notlar:
- Şu anda public preview aşamasında
- Production workload'lar için önerilmiyor
- Service-level agreement yok
- Bazı özellikler desteklenmeyebilir veya kısıtlı olabilir
- **Chat playground** `gpt-4o-mini-realtime-preview` modelini desteklemiyor
- **Audio playground** kullanılmalı


## Pratik Implementasyon - Collabnix Projesi

### Proje Özeti:
- JavaScript (frontend) + Python FastAPI (backend) ile conversational agent
- Plug-and-play çözüm
- Veritabanı kurulumu gerektirmiyor
- Karmaşık altyapı gereksinimleri yok

### Çözülen Problemler:
- Gerçek zamanlı iletişim sistemleri oluşturma zorluğu
- Ölçeklenebilirlik ve verimlilik
- Kolay entegrasyon
- Session state ve konuşma verisi yönetimi karmaşıklığı

### Çözüm Mimarisi:
- **Backend**: FastAPI ile WebSocket iletişimi
- **Frontend**: React ile seamless kullanıcı etkileşimi
- **Storage**: Redis (lightweight, temporary storage)
- **State Management**: WebSocket tabanlı session yönetimi

### Özellikler:
- Ses ve metin iletişimi
- Gerçek zamanlı AI yanıtları
- WebSocket ile session yönetimi
- Ses transkripsiyon desteği
- Özel AI talimatları
- Çoklu organizasyon desteği
- İndirilebilir konuşma geçmişi

### Backend Kod Örneği (Python FastAPI):

```python
import os
import json
import asyncio
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from websockets.client import connect

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/gpt-api/chat_stream/{organization}/{request_id}")
async def chat_stream(websocket: WebSocket, organization: str, request_id: str):
    await websocket.accept()
    async with connect("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01") as openai_ws:
        # OpenAI API ile iletişim logic'i
        pass
```

### Frontend Kod Örneği (React):

```javascript
// App.jsx
import React, { useState, useEffect } from 'react';

function App() {
  const [messages, setMessages] = useState([]);
  const ws = new WebSocket("ws://localhost:8000/gpt-api/chat_stream/organization1/request-id");

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    setMessages([...messages, { sender: "AI", text: message.text }]);
  };

  const sendMessage = (text) => {
    ws.send(JSON.stringify({ text }));
    setMessages([...messages, { sender: "You", text }]);
  };

  return (
    <div>
      <h1>Chat with AI</h1>
      <div>
        {messages.map((msg, idx) => (
          <p key={idx}><strong>{msg.sender}:</strong> {msg.text}</p>
        ))}
      </div>
      <textarea onBlur={(e) => sendMessage(e.target.value)} />
    </div>
  );
}

export default App;
```

### Kurulum Adımları:
1. Repository clone: `git clone https://github.com/Adesoji1/OpenaiRealtime-API.git`
2. Dependencies kurulumu (backend: Python 3.11.6, frontend: Node v20.12.2, npm 10.5.0)
3. OpenAI API key ayarlama
4. Backend çalıştırma: `uvicorn main:app --host 0.0.0.0 --port 8000`
5. Frontend çalıştırma: `npm run dev` (frontend directory'de)
6. Uygulama erişimi: `http://localhost:5173`

### Organizasyonlar İçin Faydalar:
- Karmaşık veritabanı kurulumu gerektirmiyor
- Çoklu kullanıcı ve organizasyon desteği
- Mevcut teknoloji çözümlerine kolay entegrasyon
- Ses ve metin modaliteleri için çok yönlü kullanım
- Müşteri desteği, sanal asistanlar, gerçek zamanlı karar verme sistemleri için uygun

### Teknik Notlar:
- WebSocket iletişimi ile neredeyse anlık yanıtlar
- Gecikme ve ölçeklenebilirlik sorunlarını çözüyor
- Cache kullanımı rate limit'leri önlemek için öneriliyor
- OpenAI Realtime implementasyonu sadece JavaScript destekliyor ama Collabnix Python backend çözümü geliştirmiş

### GitHub Repository:
- https://github.com/Adesoji1/OpenaiRealtime-API


## OpenAI Resmi Console Örneği

### Repository: https://github.com/openai/openai-realtime-console

### Özellikler:
- React app ile WebRTC kullanımı
- Realtime API event'lerini gönderme ve alma
- Client-side function calling konfigürasyonu
- JSON payload'ları görüntüleme (client ve server events)
- Logging panel ile debugging

### Kurulum:
```bash
cp .env.example .env
npm install
npm run dev
```
- http://localhost:3000 adresinde çalışır

### Mimari:
- Express server ile React frontend
- Vite build sistemi
- WebRTC data channel üzerinden Realtime API events

### App.jsx Kod Örneği:

```javascript
import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Realtime API
    pc.setLocalDescription(await pc.createOffer());
    const baseUrl = data.client_secret.value;
    const model = "gpt-4o-realtime-preview-2024-12-17";

    const sdpResponse = await fetch(
      `https://api.openai.com/v1/realtime?model=${model}`,
      {
        method: "POST",
        body: pc.localDescription.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
      }
    );

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    setIsSessionActive(true);
    peerConnection.current = pc;
  }
}
```

### Önemli Teknik Detaylar:

#### WebRTC Setup:
1. **RTCPeerConnection** oluşturma
2. **Audio element** setup (model'den gelen ses için)
3. **Local audio track** ekleme (mikrofon girişi)
4. **Data channel** oluşturma (event'ler için)

#### Session Başlatma:
1. OpenAI'den session token alma (`/token` endpoint)
2. Local description set etme (`createOffer()`)
3. OpenAI Realtime API'ye SDP gönderme
4. Remote description set etme

#### API Endpoint:
```
https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17
```

#### Headers:
```javascript
{
  Authorization: `Bearer ${EPHEMERAL_KEY}`,
  "Content-Type": "application/sdp",
}
```

### Önceki WebSocket Versiyonu:
- Tarayıcılarda önerilmiyor
- Eski versiyon hala mevcut: https://github.com/openai/openai-realtime-console/tree/websockets

### Lisans: MIT

### Daha Kapsamlı Örnek:
- OpenAI Realtime Agents demo (Next.js ile)
- OpenAI Swarm'dan ilham alan agentic architecture


### Detaylı Kod Örnekleri (App.jsx devamı):

#### Session Durdurma:
```javascript
function stopSession() {
  if (dataChannel) {
    dataChannel.close();
  }
  
  if (peerConnection.current) {
    peerConnection.current.close();
  }
  
  setIsSessionActive(false);
  setDataChannel(null);
  peerConnection.current = null;
}
```

#### Client Event Gönderme:
```javascript
function sendClientEvent(message) {
  if (dataChannel) {
    const timestamp = new Date().toLocaleTimeString();
    message.event_id = message.event_id || crypto.randomUUID();
    
    // Send event before setting timestamp since the backend peer doesn't expect this field
    dataChannel.send(JSON.stringify(message));
    
    // If guard just in case the timestamp exists by miracle
    if (!message.timestamp) {
      message.timestamp = timestamp;
    }
    
    setEvents((prev) => [message, ...prev]);
  } else {
    console.error(
      "Failed to send message - no data channel available",
      message,
    );
  }
}
```

#### Text Message Gönderme:
```javascript
function sendTextMessage(message) {
  const event = {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [
        {
          type: "input_text",
          text: message,
        },
      ],
    },
  };
  
  sendClientEvent(event);
  
  // Trigger a response from the model
  sendClientEvent({
    type: "response.create",
  });
}
```

#### Data Channel Event Handling:
```javascript
useEffect(() => {
  if (dataChannel) {
    dataChannel.onopen = () => {
      console.log("Data channel opened");
      
      // Send session configuration
      sendClientEvent({
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          instructions: "You are a helpful assistant.",
          voice: "alloy",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: {
            model: "whisper-1",
          },
        },
      });
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const timestamp = new Date().toLocaleTimeString();
        message.timestamp = timestamp;
        
        setEvents((prev) => [message, ...prev]);
        
        // Handle specific event types
        if (message.type === "response.audio.delta") {
          // Handle audio streaming
          handleAudioDelta(message);
        } else if (message.type === "conversation.item.input_audio_transcription.completed") {
          // Handle transcription completion
          console.log("Transcription:", message.transcript);
        }
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };
    
    dataChannel.onerror = (error) => {
      console.error("Data channel error:", error);
    };
    
    dataChannel.onclose = () => {
      console.log("Data channel closed");
    };
  }
}, [dataChannel]);
```

#### Audio Handling:
```javascript
function handleAudioDelta(message) {
  if (message.delta) {
    // Convert base64 audio data to playable format
    const audioData = atob(message.delta);
    const audioBuffer = new ArrayBuffer(audioData.length);
    const view = new Uint8Array(audioBuffer);
    
    for (let i = 0; i < audioData.length; i++) {
      view[i] = audioData.charCodeAt(i);
    }
    
    // Play audio chunk
    playAudioChunk(audioBuffer);
  }
}
```

#### Session Configuration:
```javascript
const sessionConfig = {
  type: "session.update",
  session: {
    modalities: ["text", "audio"],
    instructions: "You are a helpful assistant. Be concise and friendly.",
    voice: "alloy", // alloy, echo, fable, onyx, nova, shimmer
    input_audio_format: "pcm16",
    output_audio_format: "pcm16",
    input_audio_transcription: {
      model: "whisper-1",
    },
    turn_detection: {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 200,
    },
    tools: [
      {
        type: "function",
        name: "get_weather",
        description: "Get the current weather for a location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "The city and state, e.g. San Francisco, CA",
            },
          },
          required: ["location"],
        },
      },
    ],
  },
};
```

### Event Types (Önemli):

#### Client Events:
- `session.update` - Session konfigürasyonu
- `conversation.item.create` - Yeni konuşma öğesi
- `response.create` - Model'den yanıt isteme
- `input_audio_buffer.append` - Ses verisi ekleme
- `input_audio_buffer.commit` - Ses verisi commit etme

#### Server Events:
- `session.created` - Session oluşturuldu
- `conversation.item.created` - Konuşma öğesi oluşturuldu
- `response.audio.delta` - Ses akışı
- `response.audio_transcript.delta` - Transkript akışı
- `response.done` - Yanıt tamamlandı
- `conversation.item.input_audio_transcription.completed` - Transkripsiyon tamamlandı

