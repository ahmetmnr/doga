import { useCallback, useEffect, useRef, useState } from 'react';

export interface SimpleRealtimeConfig {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onResponse?: (response: any) => void;
  onToolCall?: (tool: string, parameters: any) => Promise<any>;
}

export function useSimpleRealtimeAPI(config: SimpleRealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Connect to OpenAI Realtime API via WebSocket
  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Get API credentials
      const tokenResponse = await fetch('/api/realtime-token');
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to get token');
      }
      
      const { token, sessionId } = await tokenResponse.json();
      
      if (!token) {
        throw new Error('No API token received');
      }
      
      sessionIdRef.current = sessionId;
      
      // Initialize audio context
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      
      // Get user microphone
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 24000
          }
        });
        mediaStreamRef.current = stream;
        setIsListening(true);
      } catch (err) {
        console.error('Microphone access denied:', err);
        throw new Error('Microphone access is required for voice interaction');
      }
      
      // Connect to OpenAI Realtime WebSocket
      const ws = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        [],
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        } as any
      );
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        config.onConnect?.();
        
        // Send initial configuration
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `Sen DOĞA adında bir sesli asistansın. Sıfır Atık Projesi hakkında bir bilgi yarışması yürütüyorsun.
              Görevlerin:
              1. Nazik ve teşvik edici bir ses tonuyla konuş
              2. Katılımcı bilgilerini topla (ad-soyad, e-posta, telefon, izin)
              3. 10 soruluk yarışmayı yönet
              4. Her soruyu net bir şekilde oku ve cevapları dinle
              5. Doğru/yanlış geri bildirimi ver
              6. Puanları takip et ve bildir
              7. Yarışma sonunda toplam puanı bildir
              Her zaman Türkçe konuş.`,
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
              silence_duration_ms: 500
            },
            tools: [
              {
                type: 'function',
                name: 'save_participant_profile',
                description: 'Save participant information',
                parameters: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    phone: { type: 'string' },
                    optIn: { type: 'boolean' }
                  },
                  required: ['name', 'email', 'phone', 'optIn']
                }
              },
              {
                type: 'function',
                name: 'get_state',
                description: 'Get current game state',
                parameters: { type: 'object', properties: {} }
              },
              {
                type: 'function',
                name: 'next_question',
                description: 'Move to next question',
                parameters: { type: 'object', properties: {} }
              },
              {
                type: 'function',
                name: 'grade_answer',
                description: 'Grade user answer',
                parameters: {
                  type: 'object',
                  properties: {
                    questionId: { type: 'string' },
                    transcript: { type: 'string' }
                  },
                  required: ['questionId', 'transcript']
                }
              },
              {
                type: 'function',
                name: 'end_quiz',
                description: 'End the quiz',
                parameters: { type: 'object', properties: {} }
              }
            ]
          }
        }));
        
        // Start sending audio if we have microphone access
        if (mediaStreamRef.current) {
          startAudioStream(ws, mediaStreamRef.current);
        }
      };
      
      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'error':
            console.error('WebSocket error:', data.error);
            setError(data.error.message);
            config.onError?.(new Error(data.error.message));
            break;
            
          case 'session.created':
          case 'session.updated':
            console.log('Session configured');
            break;
            
          case 'input_audio_buffer.speech_started':
            setIsListening(true);
            break;
            
          case 'input_audio_buffer.speech_stopped':
            setIsListening(false);
            break;
            
          case 'conversation.item.input_audio_transcription.completed':
            const userTranscript = data.transcript;
            setTranscript(userTranscript);
            config.onTranscript?.(userTranscript, true);
            break;
            
          case 'response.audio.started':
            setIsSpeaking(true);
            break;
            
          case 'response.audio.done':
            setIsSpeaking(false);
            break;
            
          case 'response.function_call_arguments.started':
            console.log('Function call started:', data.name);
            break;
            
          case 'response.function_call_arguments.done':
            if (config.onToolCall) {
              const result = await config.onToolCall(data.name, JSON.parse(data.arguments));
              
              // Send function result back
              ws.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: data.call_id,
                  output: JSON.stringify(result)
                }
              }));
            }
            break;
            
          case 'response.done':
            config.onResponse?.(data);
            break;
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('Connection error');
        config.onError?.(new Error('WebSocket connection failed'));
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        config.onDisconnect?.();
      };
      
      wsRef.current = ws;
      
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      config.onError?.(err as Error);
    }
  }, [config]);

  // Start streaming audio to WebSocket
  const startAudioStream = (ws: WebSocket, stream: MediaStream) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;
    
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(2048, 1, 1);
    
    source.connect(processor);
    processor.connect(audioContext.destination);
    
    processor.onaudioprocess = (e) => {
      if (ws.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Send audio data
        ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)))
        }));
      }
    };
  };

  // Disconnect
  const disconnect = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    config.onDisconnect?.();
  }, [config]);

  // Send text message
  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not ready');
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text
        }]
      }
    }));
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
