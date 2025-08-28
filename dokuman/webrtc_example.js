/**
 * OpenAI Realtime API - WebRTC Implementation Example
 * Bu örnek, WebRTC kullanarak OpenAI Realtime API'ye nasıl bağlanılacağını gösterir
 */

class OpenAIRealtimeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.peerConnection = null;
    this.dataChannel = null;
    this.audioElement = null;
    this.isSessionActive = false;
    this.events = [];
    
    // Event listeners
    this.onSessionStart = null;
    this.onSessionEnd = null;
    this.onMessage = null;
    this.onAudioReceived = null;
    this.onTranscriptionReceived = null;
    this.onError = null;
  }

  /**
   * Session başlatma
   */
  async startSession() {
    try {
      console.log('Starting OpenAI Realtime session...');
      
      // 1. Session token alma
      const tokenResponse = await this.getSessionToken();
      const ephemeralKey = tokenResponse.client_secret.value;
      
      // 2. RTCPeerConnection oluşturma
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      
      // 3. Audio element setup
      this.setupAudioElement();
      
      // 4. Local audio track ekleme (mikrofon)
      await this.setupMicrophone();
      
      // 5. Data channel oluşturma
      this.setupDataChannel();
      
      // 6. WebRTC offer oluşturma
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // 7. OpenAI'ye SDP gönderme
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${model}`,
        {
          method: 'POST',
          body: this.peerConnection.localDescription.sdp,
          headers: {
            'Authorization': `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
        }
      );
      
      if (!sdpResponse.ok) {
        throw new Error(`SDP request failed: ${sdpResponse.status}`);
      }
      
      // 8. Remote description set etme
      const answerSdp = await sdpResponse.text();
      const answer = {
        type: 'answer',
        sdp: answerSdp,
      };
      await this.peerConnection.setRemoteDescription(answer);
      
      this.isSessionActive = true;
      console.log('Session started successfully');
      
      if (this.onSessionStart) {
        this.onSessionStart();
      }
      
    } catch (error) {
      console.error('Failed to start session:', error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Session token alma
   */
  async getSessionToken() {
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`);
    }
    
    return await response.json();
  }

  /**
   * Audio element setup
   */
  setupAudioElement() {
    this.audioElement = document.createElement('audio');
    this.audioElement.autoplay = true;
    this.audioElement.controls = false;
    
    // Remote audio track handling
    this.peerConnection.ontrack = (event) => {
      console.log('Received remote audio track');
      this.audioElement.srcObject = event.streams[0];
      
      if (this.onAudioReceived) {
        this.onAudioReceived(event.streams[0]);
      }
    };
  }

  /**
   * Mikrofon setup
   */
  async setupMicrophone() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        },
      });
      
      // Audio track'i peer connection'a ekleme
      const audioTrack = mediaStream.getAudioTracks()[0];
      this.peerConnection.addTrack(audioTrack, mediaStream);
      
      console.log('Microphone setup completed');
      
    } catch (error) {
      console.error('Microphone setup failed:', error);
      throw new Error('Microphone access required for voice interaction');
    }
  }

  /**
   * Data channel setup
   */
  setupDataChannel() {
    this.dataChannel = this.peerConnection.createDataChannel('oai-events', {
      ordered: true,
    });
    
    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      this.sendSessionConfiguration();
    };
    
    this.dataChannel.onmessage = (event) => {
      this.handleServerEvent(event.data);
    };
    
    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      if (this.onError) {
        this.onError(error);
      }
    };
    
    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };
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
        tools: [],
      },
    };
    
    this.sendClientEvent(config);
  }

  /**
   * Client event gönderme
   */
  sendClientEvent(event) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel not available');
      return;
    }
    
    // Event ID ekleme
    if (!event.event_id) {
      event.event_id = this.generateEventId();
    }
    
    // Timestamp ekleme
    const timestamp = new Date().toISOString();
    
    try {
      this.dataChannel.send(JSON.stringify(event));
      
      // Event'i local olarak kaydetme
      const localEvent = { ...event, timestamp, direction: 'outgoing' };
      this.events.push(localEvent);
      
      console.log('Sent event:', event.type);
      
    } catch (error) {
      console.error('Failed to send event:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Server event handling
   */
  handleServerEvent(data) {
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
          console.log('Session created:', event.session);
          break;
          
        case 'conversation.item.input_audio_transcription.completed':
          console.log('Transcription:', event.transcript);
          if (this.onTranscriptionReceived) {
            this.onTranscriptionReceived(event.transcript);
          }
          break;
          
        case 'response.audio.delta':
          // Audio streaming handled by WebRTC
          break;
          
        case 'response.audio_transcript.delta':
          console.log('Audio transcript delta:', event.delta);
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
      console.error('Failed to parse server event:', error);
      if (this.onError) {
        this.onError(error);
      }
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
    
    this.sendClientEvent(event);
    
    // Response tetikleme
    this.sendClientEvent({
      type: 'response.create',
    });
  }

  /**
   * Session durdurma
   */
  async stopSession() {
    try {
      console.log('Stopping session...');
      
      if (this.dataChannel) {
        this.dataChannel.close();
        this.dataChannel = null;
      }
      
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      if (this.audioElement) {
        this.audioElement.srcObject = null;
        this.audioElement = null;
      }
      
      this.isSessionActive = false;
      
      console.log('Session stopped');
      
      if (this.onSessionEnd) {
        this.onSessionEnd();
      }
      
    } catch (error) {
      console.error('Error stopping session:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
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
   * Session durumunu kontrol etme
   */
  isConnected() {
    return this.isSessionActive && 
           this.dataChannel && 
           this.dataChannel.readyState === 'open';
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OpenAIRealtimeClient;
}

// Usage example:
/*
const client = new OpenAIRealtimeClient('your-api-key');

// Event listeners
client.onSessionStart = () => {
  console.log('Session started!');
};

client.onMessage = (event) => {
  console.log('New message:', event);
};

client.onTranscriptionReceived = (transcript) => {
  console.log('You said:', transcript);
};

client.onError = (error) => {
  console.error('Error:', error);
};

// Start session
await client.startSession();

// Send a text message
client.sendTextMessage('Merhaba, nasılsın?');

// Stop session when done
await client.stopSession();
*/

