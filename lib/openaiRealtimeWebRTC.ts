import { useCallback, useEffect, useRef, useState } from 'react';

export interface RealtimeConfig {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onResponse?: (response: any) => void;
  onToolCall?: (tool: string, parameters: any) => Promise<any>;
}

export function useOpenAIRealtimeWebRTC(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const sessionIdRef = useRef<string>('');

  // Connect using OpenAI's official WebRTC method
  const connect = useCallback(async () => {
    try {
      setError(null);
      console.log('🚀 Starting OpenAI Realtime WebRTC connection...');
      
      // 1. Get ephemeral token from our backend
      console.log('🔑 Getting ephemeral token...');
      const tokenResponse = await fetch('/api/realtime-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to get ephemeral token');
      }
      
      const tokenData = await tokenResponse.json();
      const ephemeralKey = tokenData.client_secret?.value;
      
      if (!ephemeralKey) {
        throw new Error('No ephemeral key received');
      }
      
      console.log('✅ Got ephemeral key:', ephemeralKey.substring(0, 10) + '...');
      sessionIdRef.current = tokenData.session_id;
      
      // 2. Create RTCPeerConnection
      console.log('🔗 Creating RTCPeerConnection...');
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      peerConnectionRef.current = pc;
      
      // 3. Setup audio element for remote audio (OpenAI's voice)
      console.log('🔊 Setting up audio element...');
      audioElementRef.current = document.createElement('audio');
      audioElementRef.current.autoplay = true;
      
      pc.ontrack = (event) => {
        console.log('📻 Received remote audio track');
        if (event.track.kind === 'audio' && audioElementRef.current) {
          audioElementRef.current.srcObject = event.streams[0];
          setIsSpeaking(true);
          
          audioElementRef.current.onplaying = () => setIsSpeaking(true);
          audioElementRef.current.onended = () => setIsSpeaking(false);
          audioElementRef.current.onpause = () => setIsSpeaking(false);
        }
      };
      
      // 4. Setup local audio (microphone)
      console.log('🎤 Setting up microphone...');
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 24000
          }
        });
        
        // Add microphone track to peer connection
        const audioTrack = mediaStream.getAudioTracks()[0];
        pc.addTrack(audioTrack, mediaStream);
        console.log('✅ Microphone added to peer connection');
        
      } catch (err) {
        throw new Error('Mikrofon erişimi gerekli. Lütfen izin verin.');
      }
      
      // 5. Setup data channel for events
      console.log('📡 Setting up data channel...');
      const dataChannel = pc.createDataChannel('oai-events', { ordered: true });
      dataChannelRef.current = dataChannel;
      
      dataChannel.onopen = () => {
        console.log('✅ Data channel opened');
        setIsConnected(true);
        config.onConnect?.();
        
        // Send session configuration (rehberdeki format)
        const sessionConfig = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `Sen DOĞA adında bir sesli asistansın. Sıfır Atık Projesi hakkında bir bilgi yarışması yürütüyorsun.
              
              Görevlerin:
              1. Nazik ve teşvik edici bir ses tonuyla konuş
              2. Katılımcı bilgilerini topla (ad-soyad, e-posta, telefon, izin)
              3. 10 soruluk yarışmayı yönet
              4. Her soruyu net bir şekilde oku ve cevapları dinle
              5. Doğru/yanlış geri bildirimi ver ve miniCorpus bilgisini paylaş
              6. Puanları takip et ve bildir
              7. Kullanıcı farklı bir soru sorarsa cevapla ve yarışmaya geri dön
              8. Yarışma sonunda toplam puanı bildir
              
              Her zaman Türkçe konuş ve anlaşılır ol. Konuşmaların kesintiye uğrayabilir (barge-in), bu durumda hemen sus ve kullanıcıyı dinle.`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
              create_response: true
            },
            tools: [
              {
                type: 'function',
                name: 'save_participant_profile',
                description: 'Katılımcı bilgilerini kaydet',
                parameters: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Ad soyad' },
                    email: { type: 'string', description: 'E-posta adresi' },
                    phone: { type: 'string', description: 'Telefon numarası' },
                    optIn: { type: 'boolean', description: 'SMS/Email izni' }
                  },
                  required: ['name', 'email', 'phone', 'optIn']
                }
              },
              {
                type: 'function',
                name: 'grade_answer',
                description: 'Cevabı değerlendir',
                parameters: {
                  type: 'object',
                  properties: {
                    questionId: { type: 'string', description: 'Soru ID' },
                    transcript: { type: 'string', description: 'Kullanıcının cevap transkripsiyonu' }
                  },
                  required: ['questionId', 'transcript']
                }
              },
              {
                type: 'function',
                name: 'next_question',
                description: 'Sonraki soruya geç',
                parameters: { type: 'object', properties: {} }
              },
              {
                type: 'function',
                name: 'end_quiz',
                description: 'Yarışmayı bitir',
                parameters: { type: 'object', properties: {} }
              }
            ]
          }
        };
        
        console.log('⚙️ Sending session configuration...');
        sendEvent(sessionConfig);
        
        // Start conversation with welcome message
        setTimeout(() => {
          sendEvent({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [{
                type: 'input_text',
                text: 'Merhaba DOĞA, yarışmaya başlayalım!'
              }]
            }
          });
          
          sendEvent({
            type: 'response.create'
          });
        }, 1000);
      };
      
      dataChannel.onmessage = async (event) => {
        try {
          const serverEvent = JSON.parse(event.data);
          const timestamp = new Date().toISOString();
          
          console.log('📨 Received event:', serverEvent.type);
          
          switch (serverEvent.type) {
            case 'error':
              console.error('❌ Server error:', serverEvent.error);
              setError(serverEvent.error.message);
              config.onError?.(new Error(serverEvent.error.message));
              break;
              
            case 'session.created':
            case 'session.updated':
              console.log('✅ Session configured');
              break;
              
            case 'conversation.item.input_audio_transcription.completed':
              const userTranscript = serverEvent.transcript;
              setTranscript(userTranscript);
              config.onTranscript?.(userTranscript, true);
              console.log('👤 User said:', userTranscript);
              break;
              
            case 'conversation.item.input_audio_transcription.partial':
              const partialTranscript = serverEvent.transcript;
              setTranscript(partialTranscript);
              config.onTranscript?.(partialTranscript, false);
              break;
              
            case 'input_audio_buffer.speech_started':
              setIsListening(true);
              console.log('🎤 Speech started');
              break;
              
            case 'input_audio_buffer.speech_stopped':
              setIsListening(false);
              console.log('🎤 Speech stopped');
              break;
              
            case 'response.audio.started':
              setIsSpeaking(true);
              console.log('🔊 DOĞA started speaking');
              break;
              
            case 'response.audio.done':
              setIsSpeaking(false);
              console.log('🔊 DOĞA finished speaking');
              break;
              
            case 'response.function_call_arguments.done':
              console.log('🛠️ Function call:', serverEvent.name);
              if (config.onToolCall) {
                try {
                  const args = JSON.parse(serverEvent.arguments);
                  const result = await config.onToolCall(serverEvent.name, args);
                  
                  // Send function result back (rehberdeki format)
                  sendEvent({
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: serverEvent.call_id,
                      output: JSON.stringify(result)
                    }
                  });
                } catch (err) {
                  console.error('Function call error:', err);
                }
              }
              break;
              
            case 'response.done':
              config.onResponse?.(serverEvent);
              break;
              
            default:
              console.log('📝 Unhandled event:', serverEvent.type);
          }
        } catch (err) {
          console.error('❌ Error parsing server event:', err);
        }
      };
      
      dataChannel.onerror = (error) => {
        console.error('❌ Data channel error:', error);
        setError('Data channel error');
        config.onError?.(new Error('Data channel error'));
      };
      
      dataChannel.onclose = () => {
        console.log('📡 Data channel closed');
        setIsConnected(false);
        config.onDisconnect?.();
      };
      
      // 6. Create WebRTC offer
      console.log('🤝 Creating WebRTC offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // 7. Send SDP to OpenAI (rehberdeki doğru yöntem)
      console.log('📤 Sending SDP to OpenAI...');
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const sdpResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${model}`,
        {
          method: 'POST',
          body: pc.localDescription?.sdp,
          headers: {
            'Authorization': `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp',
          },
        }
      );
      
      if (!sdpResponse.ok) {
        const errorText = await sdpResponse.text();
        throw new Error(`SDP exchange failed: ${sdpResponse.status} ${errorText}`);
      }
      
      // 8. Set remote description
      console.log('📥 Setting remote description...');
      const answerSdp = await sdpResponse.text();
      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: answerSdp,
      };
      await pc.setRemoteDescription(answer);
      
      console.log('🎉 WebRTC connection established!');
      
      // Helper function to send events
      function sendEvent(event: any) {
        if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
          console.error('❌ Data channel not ready');
          return;
        }
        
        // Add event ID if not present
        if (!event.event_id) {
          event.event_id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        
        try {
          dataChannelRef.current.send(JSON.stringify(event));
          console.log('📤 Sent event:', event.type);
        } catch (err) {
          console.error('❌ Failed to send event:', err);
        }
      }
      
    } catch (err) {
      console.error('❌ WebRTC connection error:', err);
      setError(err instanceof Error ? err.message : 'WebRTC bağlantısı kurulamadı');
      config.onError?.(err as Error);
    }
  }, [config]);

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting...');
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.srcObject = null;
      audioElementRef.current = null;
    }
    
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    config.onDisconnect?.();
  }, [config]);

  // Send text message (rehberdeki format)
  const sendMessage = useCallback((text: string) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.error('❌ Data channel not ready');
      return;
    }
    
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    };
    
    try {
      dataChannelRef.current.send(JSON.stringify(event));
      
      // Trigger response
      dataChannelRef.current.send(JSON.stringify({
        type: 'response.create'
      }));
      
      console.log('📤 Sent text message:', text);
    } catch (err) {
      console.error('❌ Failed to send message:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    error,
    sessionId: sessionIdRef.current,
    connect,
    disconnect,
    sendMessage
  };
}
