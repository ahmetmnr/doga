/**
 * OpenAI Realtime API - WebSocket Implementation Example
 * Bu örnek, WebSocket kullanarak OpenAI Realtime API'ye nasıl bağlanılacağını gösterir
 * Not: Bu implementasyon server-side kullanım için uygundur
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

class OpenAIRealtimeWebSocketClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.ws = null;
    this.isConnected = false;
    this.events = [];
    this.audioBuffer = [];
    
    // Event listeners
    this.onConnect = null;
    this.onDisconnect = null;
    this.onMessage = null;
    this.onAudioReceived = null;
    this.onTranscriptionReceived = null;
    this.onError = null;
    
    // Audio handling
    this.audioContext = null;
    this.audioQueue = [];
    this.isPlaying = false;
  }

  /**
   * WebSocket bağlantısı kurma
   */
  async connect() {
    try {
      console.log('Connecting to OpenAI Realtime API via WebSocket...');
      
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const url = `wss://api.openai.com/v1/realtime?model=${model}`;
      
      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });
      
      this.setupEventHandlers();
      
      return new Promise((resolve, reject) => {
        this.ws.on('open', () => {
          this.isConnected = true;
          console.log('WebSocket connected');
          this.sendSessionConfiguration();
          
          if (this.onConnect) {
            this.onConnect();
          }
          
          resolve();
        });
        
        this.ws.on('error', (error) => {
          console.error('WebSocket connection error:', error);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('Failed to connect:', error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Event handler'ları setup etme
   */
  setupEventHandlers() {
    this.ws.on('message', (data) => {
      this.handleServerMessage(data.toString());
    });
    
    this.ws.on('close', (code, reason) => {
      console.log(`WebSocket closed: ${code} - ${reason}`);
      this.isConnected = false;
      
      if (this.onDisconnect) {
        this.onDisconnect(code, reason);
      }
    });
    
    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      if (this.onError) {
        this.onError(error);
      }
    });
    
    // Ping/Pong handling for keepalive
    this.ws.on('ping', () => {
      this.ws.pong();
    });
  }

  /**
   * Session konfigürasyonu gönderme
   */
  sendSessionConfiguration() {
    const config = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'Sen yardımcı bir asistansın. Türkçe konuş ve kısa, net yanıtlar ver.',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        tools: [
          {
            type: 'function',
            name: 'get_current_time',
            description: 'Şu anki zamanı öğren',
            parameters: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            type: 'function',
            name: 'calculate',
            description: 'Matematiksel hesaplama yap',
            parameters: {
              type: 'object',
              properties: {
                expression: {
                  type: 'string',
                  description: 'Hesaplanacak matematiksel ifade',
                },
              },
              required: ['expression'],
            },
          },
        ],
      },
    };
    
    this.sendEvent(config);
  }

  /**
   * Event gönderme
   */
  sendEvent(event) {
    if (!this.isConnected || !this.ws) {
      console.error('WebSocket not connected');
      return false;
    }
    
    // Event ID ekleme
    if (!event.event_id) {
      event.event_id = this.generateEventId();
    }
    
    try {
      const message = JSON.stringify(event);
      this.ws.send(message);
      
      // Event'i local olarak kaydetme
      const timestamp = new Date().toISOString();
      const localEvent = { ...event, timestamp, direction: 'outgoing' };
      this.events.push(localEvent);
      
      console.log('Sent event:', event.type);
      return true;
      
    } catch (error) {
      console.error('Failed to send event:', error);
      if (this.onError) {
        this.onError(error);
      }
      return false;
    }
  }

  /**
   * Server mesajı handling
   */
  handleServerMessage(data) {
    try {
      const event = JSON.parse(data);
      const timestamp = new Date().toISOString();
      
      // Event'i kaydetme
      const serverEvent = { ...event, timestamp, direction: 'incoming' };
      this.events.push(serverEvent);
      
      console.log('Received event:', event.type);
      
      // Event type'a göre handling
      switch (event.type) {
        case 'session.created':
          console.log('Session created:', event.session.id);
          break;
          
        case 'session.updated':
          console.log('Session updated');
          break;
          
        case 'conversation.item.created':
          console.log('Conversation item created:', event.item.id);
          break;
          
        case 'conversation.item.input_audio_transcription.completed':
          console.log('Transcription completed:', event.transcript);
          if (this.onTranscriptionReceived) {
            this.onTranscriptionReceived(event.transcript);
          }
          break;
          
        case 'response.created':
          console.log('Response created:', event.response.id);
          break;
          
        case 'response.output_item.added':
          console.log('Output item added:', event.item.type);
          break;
          
        case 'response.content_part.added':
          console.log('Content part added:', event.part.type);
          break;
          
        case 'response.audio.delta':
          this.handleAudioDelta(event);
          break;
          
        case 'response.audio.done':
          console.log('Audio response completed');
          break;
          
        case 'response.audio_transcript.delta':
          console.log('Audio transcript delta:', event.delta);
          break;
          
        case 'response.audio_transcript.done':
          console.log('Audio transcript completed:', event.transcript);
          break;
          
        case 'response.function_call_arguments.delta':
          console.log('Function call arguments delta:', event.delta);
          break;
          
        case 'response.function_call_arguments.done':
          console.log('Function call arguments done:', event.arguments);
          this.handleFunctionCall(event);
          break;
          
        case 'response.done':
          console.log('Response completed');
          break;
          
        case 'error':
          console.error('Server error:', event.error);
          if (this.onError) {
            this.onError(new Error(event.error.message));
          }
          break;
          
        default:
          console.log('Unhandled event type:', event.type);
      }
      
      // Generic message callback
      if (this.onMessage) {
        this.onMessage(serverEvent);
      }
      
    } catch (error) {
      console.error('Failed to parse server message:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Audio delta handling
   */
  handleAudioDelta(event) {
    if (event.delta) {
      // Base64 audio data'yı decode etme
      const audioData = Buffer.from(event.delta, 'base64');
      this.audioBuffer.push(audioData);
      
      if (this.onAudioReceived) {
        this.onAudioReceived(audioData);
      }
    }
  }

  /**
   * Function call handling
   */
  handleFunctionCall(event) {
    try {
      const args = JSON.parse(event.arguments);
      const functionName = event.name;
      
      console.log(`Executing function: ${functionName}`, args);
      
      let result;
      
      switch (functionName) {
        case 'get_current_time':
          result = new Date().toLocaleString('tr-TR');
          break;
          
        case 'calculate':
          try {
            // Basit hesaplama (güvenlik için eval kullanmayın production'da)
            result = eval(args.expression);
          } catch (error) {
            result = 'Hesaplama hatası: ' + error.message;
          }
          break;
          
        default:
          result = `Bilinmeyen fonksiyon: ${functionName}`;
      }
      
      // Function call sonucunu gönderme
      this.sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: event.call_id,
          output: JSON.stringify(result),
        },
      });
      
    } catch (error) {
      console.error('Function call error:', error);
      
      // Hata sonucunu gönderme
      this.sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: event.call_id,
          output: JSON.stringify({ error: error.message }),
        },
      });
    }
  }

  /**
   * Text mesajı gönderme
   */
  sendTextMessage(text) {
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text,
          },
        ],
      },
    };
    
    this.sendEvent(event);
    
    // Response tetikleme
    this.sendEvent({
      type: 'response.create',
    });
  }

  /**
   * Audio dosyası gönderme
   */
  async sendAudioFile(filePath) {
    try {
      const audioData = fs.readFileSync(filePath);
      const base64Audio = audioData.toString('base64');
      
      // Audio buffer'ı append etme
      this.sendEvent({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      });
      
      // Audio buffer'ı commit etme
      this.sendEvent({
        type: 'input_audio_buffer.commit',
      });
      
      console.log('Audio file sent:', filePath);
      
    } catch (error) {
      console.error('Failed to send audio file:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Audio buffer'ı WAV dosyası olarak kaydetme
   */
  saveAudioBuffer(outputPath) {
    if (this.audioBuffer.length === 0) {
      console.log('No audio data to save');
      return;
    }
    
    try {
      const combinedBuffer = Buffer.concat(this.audioBuffer);
      
      // WAV header oluşturma (PCM16, 24kHz, mono)
      const wavHeader = this.createWavHeader(combinedBuffer.length);
      const wavFile = Buffer.concat([wavHeader, combinedBuffer]);
      
      fs.writeFileSync(outputPath, wavFile);
      console.log('Audio saved to:', outputPath);
      
      // Buffer'ı temizleme
      this.audioBuffer = [];
      
    } catch (error) {
      console.error('Failed to save audio:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * WAV header oluşturma
   */
  createWavHeader(dataLength) {
    const buffer = Buffer.alloc(44);
    
    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataLength, 4);
    buffer.write('WAVE', 8);
    
    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // chunk size
    buffer.writeUInt16LE(1, 20);  // audio format (PCM)
    buffer.writeUInt16LE(1, 22);  // num channels (mono)
    buffer.writeUInt32LE(24000, 24); // sample rate
    buffer.writeUInt32LE(48000, 28); // byte rate
    buffer.writeUInt16LE(2, 32);  // block align
    buffer.writeUInt16LE(16, 34); // bits per sample
    
    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataLength, 40);
    
    return buffer;
  }

  /**
   * Bağlantıyı kapatma
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('Disconnected from OpenAI Realtime API');
  }

  /**
   * Event ID oluşturma
   */
  generateEventId() {
    return 'evt_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Event geçmişini alma
   */
  getEvents() {
    return this.events;
  }

  /**
   * Bağlantı durumunu kontrol etme
   */
  isWebSocketConnected() {
    return this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = OpenAIRealtimeWebSocketClient;

// Usage example:
/*
const client = new OpenAIRealtimeWebSocketClient('your-api-key');

// Event listeners
client.onConnect = () => {
  console.log('Connected to OpenAI Realtime API!');
};

client.onMessage = (event) => {
  console.log('New event:', event.type);
};

client.onTranscriptionReceived = (transcript) => {
  console.log('Transcription:', transcript);
};

client.onAudioReceived = (audioData) => {
  console.log('Received audio chunk:', audioData.length, 'bytes');
};

client.onError = (error) => {
  console.error('Error:', error);
};

// Connect and start conversation
async function main() {
  try {
    await client.connect();
    
    // Send a text message
    client.sendTextMessage('Merhaba! Bugün nasılsın?');
    
    // Send audio file
    // await client.sendAudioFile('./audio.wav');
    
    // Keep connection alive for a while
    setTimeout(() => {
      client.saveAudioBuffer('./response.wav');
      client.disconnect();
    }, 30000);
    
  } catch (error) {
    console.error('Failed to start:', error);
  }
}

// main();
*/

