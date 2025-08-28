/**
 * OpenAI Realtime API için WebRTC istemcisi
 * Belgede belirtilen resmi implementasyon
 */

export interface WebRTCClientConfig {
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onDataChannelOpen?: () => void;
  onDataChannelClose?: () => void;
  onEventReceived?: (event: any) => void;
  onRemoteTrack?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
}

export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private localStream: MediaStream | null = null;
  private config: WebRTCClientConfig;

  constructor(config: WebRTCClientConfig = {}) {
    this.config = config;
  }

  /**
   * Oturumu başlatır ve OpenAI'ye bağlanır (belgede belirtilen yöntem)
   */
  async start() {
    if (this.peerConnection) {
      console.warn("Session is already active.");
      return;
    }

    try {
      console.log('🚀 Starting WebRTC session with OpenAI Realtime API...');

      // 1. Backend'den ephemeral token al (belgede belirtilen güvenlik yöntemi)
      const ephemeralKey = await this.fetchEphemeralKey();

      // 2. RTCPeerConnection oluştur
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      this.peerConnection.onconnectionstatechange = () => {
        if (this.config.onConnectionStateChange) {
          this.config.onConnectionStateChange(this.peerConnection!.connectionState);
        }
      };

      // 3. Medya akışlarını ayarla
      await this.setupLocalMedia();
      this.setupRemoteMedia();

      // 4. Veri kanalını ayarla
      this.setupDataChannel();

      // 5. Sinyalizasyon sürecini başlat (belgede belirtilen SDP exchange)
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      const answerSdp = await this.exchangeSdpWithOpenAI(offer.sdp!, ephemeralKey);

      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      console.log("✅ WebRTC session started successfully");

    } catch (error) {
      console.error("❌ Failed to start WebRTC session:", error);
      this.stop(); // Hata durumunda temizlik yap
      throw error;
    }
  }

  /**
   * Oturumu durdurur ve kaynakları temizler
   */
  stop() {
    console.log('🔌 Stopping WebRTC session...');
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.audioElement) {
        this.audioElement.remove();
        this.audioElement = null;
    }
    console.log("✅ WebRTC session stopped");
  }

  /**
   * OpenAI'ye bir istemci olayı gönderir (belgede belirtilen format)
   */
  sendEvent(event: any) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error("❌ Data channel is not open. Cannot send event.");
      return;
    }
    
    // Event ID ekleme (belgede belirtilen gereklilik)
    if (!event.event_id) {
      event.event_id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    try {
      this.dataChannel.send(JSON.stringify(event));
      console.log('📤 Sent event:', event.type);
    } catch (error) {
      console.error('❌ Failed to send event:', error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }

  // --- Private Helper Methods ---

  private async fetchEphemeralKey(): Promise<string> {
    console.log('🔑 Fetching ephemeral key from backend...');
    
    const response = await fetch('/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch ephemeral key from backend.");
    }
    
    const data = await response.json();
    console.log('✅ Got ephemeral key:', data.client_secret.value.substring(0, 10) + '...');
    return data.client_secret.value;
  }

  private async setupLocalMedia() {
    console.log('🎤 Setting up local media (microphone)...');
    
    this.localStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000
      }
    });
    
    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });
    
    console.log('✅ Microphone added to peer connection');
  }

  private setupRemoteMedia() {
    console.log('🔊 Setting up remote media (OpenAI audio)...');
    
    this.audioElement = document.createElement('audio');
    this.audioElement.autoplay = true;
    document.body.appendChild(this.audioElement);

    this.peerConnection!.ontrack = (event) => {
      console.log("📻 Received remote track:", event.track.kind);
      if (event.track.kind === 'audio' && event.streams[0]) {
        this.audioElement!.srcObject = event.streams[0];
        if (this.config.onRemoteTrack) {
            this.config.onRemoteTrack(event.streams[0]);
        }
      }
    };
  }

  private setupDataChannel() {
    console.log('📡 Setting up data channel...');
    
    this.dataChannel = this.peerConnection!.createDataChannel('oai-events', { ordered: true });
    
    this.dataChannel.onopen = () => {
      console.log("✅ Data channel is open");
      if (this.config.onDataChannelOpen) {
        this.config.onDataChannelOpen();
      }
    };
    
    this.dataChannel.onclose = () => {
      console.log("📡 Data channel is closed");
      if (this.config.onDataChannelClose) {
        this.config.onDataChannelClose();
      }
    };
    
    this.dataChannel.onmessage = (event) => {
      try {
        const parsedEvent = JSON.parse(event.data);
        console.log('📨 Received event:', parsedEvent.type);
        if (this.config.onEventReceived) {
          this.config.onEventReceived(parsedEvent);
        }
      } catch (e) {
        console.error("❌ Failed to parse incoming event:", e);
      }
    };
    
    this.dataChannel.onerror = (error) => {
      console.error('❌ Data channel error:', error);
      if (this.config.onError) {
        this.config.onError(new Error('Data channel error'));
      }
    };
  }

  private async exchangeSdpWithOpenAI(sdp: string, ephemeralKey: string): Promise<string> {
    console.log('🤝 Exchanging SDP with OpenAI...');
    
    const model = 'gpt-4o-realtime-preview-2024-12-17';
    const url = `https://api.openai.com/v1/realtime?model=${model}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp', // Belgede belirtilen doğru Content-Type
        'Authorization': `Bearer ${ephemeralKey}`,
      },
      body: sdp,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SDP exchange failed: ${response.status} ${errorBody}`);
    }

    const answerSdp = await response.text();
    console.log('✅ Received SDP answer from OpenAI');
    return answerSdp;
  }
}
