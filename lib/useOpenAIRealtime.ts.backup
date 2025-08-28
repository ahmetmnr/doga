import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionPool } from './connectionPool';

// WebRTC Client interface tanımı
interface WebRTCClientConfig {
  onConnectionStateChange?: (state: string) => void;
  onDataChannelOpen?: () => void;
  onDataChannelClose?: () => void;
  onEventReceived?: (event: any) => Promise<void>;
  onRemoteTrack?: (stream: MediaStream) => void;
  onError?: (error: Error) => void;
}

// WebRTC Client sınıfı (basitleştirilmiş versiyon)
class WebRTCClient {
  private config: WebRTCClientConfig;
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioElement: HTMLAudioElement | null = null;

  constructor(config: WebRTCClientConfig) {
    this.config = config;
  }

  async start() {
    try {
      console.log('🚀 Starting WebRTC connection...');
      
      // Get ephemeral token first
      const tokenResponse = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Failed to get ephemeral token');
      }
      
      const { client_secret } = await tokenResponse.json();
      const ephemeralKey = client_secret.value;
      
      console.log('✅ Got ephemeral key:', ephemeralKey.substring(0, 10) + '...');

      // RTCPeerConnection oluştur
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Data channel oluştur
      this.dataChannel = this.pc.createDataChannel('oai-events', {
        ordered: true
      });

      this.dataChannel.onopen = () => {
        console.log('✅ Data channel opened');
        this.config.onDataChannelOpen?.();
      };

      this.dataChannel.onclose = () => {
        console.log('📡 Data channel closed');
        this.config.onDataChannelClose?.();
      };

      this.dataChannel.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this.config.onEventReceived?.(data);
        } catch (err) {
          console.error('❌ Error parsing message:', err);
        }
      };

      // Connection state monitoring
      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState || 'disconnected';
        console.log('🔗 Connection state:', state);
        this.config.onConnectionStateChange?.(state);
      };

      // Remote track handling for audio
      this.pc.ontrack = (event) => {
        console.log('📻 Remote track received');
        const [stream] = event.streams;
        
        if (!this.audioElement) {
          this.audioElement = document.createElement('audio');
          this.audioElement.autoplay = true;
          document.body.appendChild(this.audioElement);
        }
        
        this.audioElement.srcObject = stream;
        this.config.onRemoteTrack?.(stream);
      };

      // Get user media for microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      stream.getTracks().forEach(track => {
        this.pc?.addTrack(track, stream);
      });

      // Create offer and connect to OpenAI
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // OpenAI Realtime API endpoint'ine bağlan
      const response = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2025-06-03`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const answerSdp = await response.text();
      await this.pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });

      console.log('🎉 WebRTC connection established!');

    } catch (error) {
      console.error('❌ WebRTC start error:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  sendEvent(event: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      // Event ID ekle
      if (!event.event_id) {
        event.event_id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      this.dataChannel.send(JSON.stringify(event));
      console.log('📤 Sent event:', event.type);
    } else {
      console.error('❌ Data channel not ready');
    }
  }

  stop() {
    console.log('🛑 Stopping WebRTC client...');
    
    if (this.audioElement) {
      this.audioElement.remove();
      this.audioElement = null;
    }
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    
    console.log('✅ WebRTC client stopped');
  }
}

// Hook interface
export interface RealtimeConfig {
  userInfo?: {
    name: string;
    email: string;
    phone: string;
    optIn: boolean;
  };
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onResponse?: (response: any) => void;
  onToolCall?: (tool: string, parameters: any) => Promise<any>;
}

// Ana hook
export function useOpenAIRealtime(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const clientRef = useRef<WebRTCClient | null>(null);
  const sessionIdRef = useRef<string>('');
  const isResponseActiveRef = useRef<boolean>(false);
  const gamePhaseRef = useRef<'registration' | 'quiz' | 'finished'>('registration');
  const participantInfoRef = useRef<any>(null);
  const pendingFunctionCallsRef = useRef<Set<string>>(new Set());
  const connectionPool = ConnectionPool.getInstance();

  // Connect function
  const connect = useCallback(async () => {
    try {
      setError(null);
      console.log('🚀 Starting OpenAI Realtime connection...');
      
      // Reset states ve yeni session ID oluştur
      const userId = config.userInfo?.email || 'anonymous';
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionIdRef.current = newSessionId;
      
      // Kullanıcının eski connection'larını kapat
      connectionPool.closeUserConnections(userId);
      
      isResponseActiveRef.current = false;
      gamePhaseRef.current = 'registration';
      participantInfoRef.current = null;
      pendingFunctionCallsRef.current.clear();
      
      // Create WebRTC client
      const client = new WebRTCClient({
        onConnectionStateChange: (state) => {
          console.log('🔗 Connection state:', state);
          setIsConnected(state === 'connected');
          
          if (state === 'failed' || state === 'disconnected') {
            setError('Bağlantı kesildi');
            config.onError?.(new Error('Connection failed'));
          }
        },
        
        onDataChannelOpen: () => {
          console.log('✅ Data channel opened, configuring session...');
          setIsConnected(true);
          config.onConnect?.();
          
          // Session configuration
          client.sendEvent({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
                             instructions: `Sen DOĞA'sın. Sıfır Atık yarışması yürütüyorsun.

BASIT AKIŞ:
1. Kendini tanıt → save_participant_profile çağır
2. get_active_question çağır → Soruyu oku  
3. Kullanıcı cevap verir → grade_answer çağır → Açıkla
4. next_question çağır → Yeni soruyu oku
5. 10 soru bitince end_quiz çağır

Samimi konuş, tool'ları kullan, sohbet et.`,
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
              tool_choice: 'auto',
              temperature: 0.8,
              max_response_output_tokens: 4096,
              tools: [
                {
                  type: 'function',
                  name: 'save_participant_profile',
                  description: 'Katılımcı bilgilerini kaydet ve yarışma fazına geç',
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
                  name: 'get_active_question',
                  description: 'Mevcut aktif soruyu getir (yarışma başlangıcında kullan)',
                  parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                  }
                },
                {
                  type: 'function',
                  name: 'grade_answer',
                  description: 'ZORUNLU: Kullanıcının her cevabını değerlendir. Cevap geldiğinde MUTLAKA çağır!',
                  parameters: {
                    type: 'object',
                    properties: {
                      questionId: { 
                        type: 'string', 
                        description: 'Aktif sorunun ID\'si (örn: q1, q2, q3)' 
                      },
                      transcript: { 
                        type: 'string', 
                        description: 'Kullanıcının tam cevap transkripsiyonu' 
                      }
                    },
                    required: ['questionId', 'transcript']
                  }
                },
                {
                  type: 'function',
                  name: 'next_question',
                  description: 'Sonraki soruya geç (kullanıcı onay verdiğinde kullan)',
                  parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                  }
                },
                {
                  type: 'function',
                  name: 'answer_user_question',
                  description: 'Kullanıcının sıfır atık hakkındaki sorularını cevapla',
                  parameters: {
                    type: 'object',
                    properties: {
                      question: { 
                        type: 'string', 
                        description: 'Kullanıcının sorusu' 
                      }
                    },
                    required: ['question']
                  }
                },
                {
                  type: 'function',
                  name: 'end_quiz',
                  description: 'Yarışmayı bitir ve session sonlandır',
                  parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                  }
                },
                {
                  type: 'function',
                  name: 'get_score',
                  description: 'Mevcut puanı getir',
                  parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                  }
                },
                {
                  type: 'function',
                  name: 'repeat_question',
                  description: 'Aktif soruyu tekrarla',
                  parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                  }
                }
              ]
            }
          });
          
          // İlk mesajı gönder
          setTimeout(() => {
            if (!isResponseActiveRef.current && config.userInfo) {
              isResponseActiveRef.current = true;
              client.sendEvent({
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [{
                    type: 'input_text',
                    text: `Merhaba DOĞA, ben ${config.userInfo.name}. Kendini tanıt ve yarışmayı başlat.`
                  }]
                }
              });
              
              client.sendEvent({
                type: 'response.create'
              });
            }
          }, 1500);
        },
        
        onDataChannelClose: () => {
          console.log('📡 Data channel closed');
          setIsConnected(false);
          config.onDisconnect?.();
        },
        
        onEventReceived: async (event) => {
          console.log('📨 Received event:', event.type);
          
          try {
            switch (event.type) {
              case 'error':
                console.error('❌ Server error:', event.error);
                setError(event.error?.message || 'Sunucu hatası');
                config.onError?.(new Error(event.error?.message || 'Server error'));
                isResponseActiveRef.current = false;
                break;
                
              case 'session.created':
              case 'session.updated':
                console.log('✅ Session configured successfully');
                break;
                
              case 'conversation.item.input_audio_transcription.completed':
                const userTranscript = event.transcript;
                if (userTranscript && userTranscript.trim()) {
                  setTranscript(userTranscript);
                  config.onTranscript?.(userTranscript, true);
                  console.log('👤 User said:', userTranscript);
                }
                break;
                
              case 'conversation.item.input_audio_transcription.partial':
                const partialTranscript = event.transcript;
                if (partialTranscript) {
                  setTranscript(partialTranscript);
                  config.onTranscript?.(partialTranscript, false);
                }
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
                console.log('🛠️ Function call:', event.name);
                
                if (config.onToolCall && event.call_id) {
                  // Duplicate call kontrolü
                  if (pendingFunctionCallsRef.current.has(event.call_id)) {
                    console.warn('⚠️ Duplicate function call ignored:', event.call_id);
                    return;
                  }
                  
                  pendingFunctionCallsRef.current.add(event.call_id);
                  
                  try {
                    const args = event.arguments ? JSON.parse(event.arguments) : {};
                    
                    // Session ID'yi args'a ekle
                    args.sessionId = sessionIdRef.current;
                    
                    const result = await config.onToolCall(event.name, args);
                    
                    // Function call sonucunu işle
                    await handleFunctionResult(event.name, result, event.call_id, client);
                    
                  } catch (err) {
                    console.error('❌ Function call error:', err);
                    
                    client.sendEvent({
                      type: 'conversation.item.create',
                      item: {
                        type: 'function_call_output',
                        call_id: event.call_id,
                        output: JSON.stringify({ 
                          error: 'Function execution failed',
                          message: err instanceof Error ? err.message : 'Unknown error'
                        })
                      }
                    });
                  } finally {
                    pendingFunctionCallsRef.current.delete(event.call_id);
                  }
                }
                break;
                
              case 'response.done':
                console.log('✅ Response completed');
                isResponseActiveRef.current = false;
                config.onResponse?.(event);
                
                // Yarışma bittiyse session'ı sonlandır
                if (gamePhaseRef.current === 'finished') {
                  console.log('🏁 Quiz finished, ending session in 3 seconds...');
                  setTimeout(() => {
                    disconnect();
                  }, 3000);
                }
                break;
                
              case 'response.created':
                console.log('🔄 Response started');
                isResponseActiveRef.current = true;
                break;
                
              case 'response.cancelled':
                console.log('🚫 Response cancelled');
                isResponseActiveRef.current = false;
                break;
                
              default:
                console.log('📨 Unhandled event:', event.type);
            }
          } catch (err) {
            console.error('❌ Event handling error:', err);
            setError('Olay işleme hatası');
          }
        },
        
        onRemoteTrack: (stream) => {
          console.log('📻 Remote audio track received');
          setIsSpeaking(true);
        },
        
        onError: (error) => {
          console.error('❌ WebRTC error:', error);
          setError(error.message);
          config.onError?.(error);
          isResponseActiveRef.current = false;
        }
      });
      
      clientRef.current = client;
      
      // Connection'ı pool'a ekle
      connectionPool.addConnection(newSessionId, userId, client);
      
      await client.start();
      
    } catch (err) {
      console.error('❌ Connection error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Bağlantı kurulamadı';
      setError(errorMessage);
      config.onError?.(err as Error);
      isResponseActiveRef.current = false;
    }
  }, [config]);

     // Function call sonuçlarını işle
   const handleFunctionResult = async (functionName: string, result: any, callId: string, client: WebRTCClient) => {
     console.log('🔄 Processing function result:', functionName, result);
     
     // Function result'ı OpenAI'ye gönder
     client.sendEvent({
       type: 'conversation.item.create',
       item: {
         type: 'function_call_output',
         call_id: callId,
         output: JSON.stringify(result)
       }
     });
     
     // ✅ KRİTİK: Tool result gönderildikten sonra response tetikle
     setTimeout(() => {
       if (!isResponseActiveRef.current) {
         console.log('🔄 Triggering response after tool result...');
         isResponseActiveRef.current = true;
         client.sendEvent({
           type: 'response.create'
         });
       }
     }, 500); // Tool result'ın işlenmesi için kısa bekle
     
     // Function'a göre phase güncelle
     switch (functionName) {
       case 'save_participant_profile':
         if (result.success) {
           participantInfoRef.current = result;
           gamePhaseRef.current = 'quiz';
           console.log('📋 Participant registered, moving to quiz phase');
         }
         break;
         
       case 'grade_answer':
         console.log('📊 Answer graded - triggering response');
         break;
         
       case 'get_active_question':
       case 'next_question':
         console.log('➡️ Question loaded - triggering response');
         if (result.finished || result.status === 'finished') {
           gamePhaseRef.current = 'finished';
           console.log('🏁 Quiz finished');
         }
         break;
         
       case 'end_quiz':
         gamePhaseRef.current = 'finished';
         console.log('🏁 Quiz ended explicitly');
         break;
         
       case 'answer_user_question':
         console.log('❓ User question answered - triggering response');
         break;
         
       case 'get_score':
       case 'repeat_question':
         console.log('📊 Utility function called - triggering response');
         break;
     }
   };

  // Disconnect
  const disconnect = useCallback(() => {
    console.log('🛑 Disconnecting...');
    
    // Connection pool'dan kaldır
    if (sessionIdRef.current) {
      connectionPool.closeConnection(sessionIdRef.current);
    }
    
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setTranscript('');
    setError(null);
    isResponseActiveRef.current = false;
    gamePhaseRef.current = 'registration';
    participantInfoRef.current = null;
    pendingFunctionCallsRef.current.clear();
    
    config.onDisconnect?.();
  }, [config]);

  // Send text message
  const sendMessage = useCallback((text: string) => {
    if (!clientRef.current || !isConnected) {
      console.error('❌ Client not ready for sending message');
      return;
    }
    
    if (isResponseActiveRef.current) {
      console.warn('⚠️ Response already in progress, message queued');
      // Mesajı queue'ya alabilirsiniz veya bekleyebilirsiniz
      setTimeout(() => sendMessage(text), 1000);
      return;
    }
    
    try {
      clientRef.current.sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{
            type: 'input_text',
            text
          }]
        }
      });
      
      // Response trigger et
      isResponseActiveRef.current = true;
      clientRef.current.sendEvent({
        type: 'response.create'
      });
      
      console.log('📤 Sent text message:', text);
    } catch (err) {
      console.error('❌ Error sending message:', err);
      setError('Mesaj gönderilemedi');
    }
  }, [isConnected]);

  // Manual response trigger
  const triggerResponse = useCallback(() => {
    if (!clientRef.current || !isConnected || isResponseActiveRef.current) {
      console.warn('⚠️ Cannot trigger response');
      return;
    }
    
    try {
      isResponseActiveRef.current = true;
      clientRef.current.sendEvent({
        type: 'response.create'
      });
      
      console.log('🔄 Manually triggered response');
    } catch (err) {
      console.error('❌ Error triggering response:', err);
      isResponseActiveRef.current = false;
    }
  }, [isConnected]);

  // Interrupt current response
  const interruptResponse = useCallback(() => {
    if (!clientRef.current || !isResponseActiveRef.current) {
      return;
    }
    
    try {
      clientRef.current.sendEvent({
        type: 'response.cancel'
      });
      
      isResponseActiveRef.current = false;
      console.log('🚫 Response interrupted');
    } catch (err) {
      console.error('❌ Error interrupting response:', err);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // State
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    error,
    
    // Game state
    sessionId: sessionIdRef.current,
    gamePhase: gamePhaseRef.current,
    hasParticipantInfo: !!participantInfoRef.current,
    isResponseActive: isResponseActiveRef.current,
    
    // Actions
    connect,
    disconnect,
    sendMessage,
    triggerResponse,
    interruptResponse,
    
    // Utility
    clearError: () => setError(null),
    clearTranscript: () => setTranscript('')
  };
}