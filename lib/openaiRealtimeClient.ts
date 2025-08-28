import { useCallback, useEffect, useRef, useState } from 'react';

export interface RealtimeConfig {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onResponse?: (response: any) => void;
  onToolCall?: (tool: string, parameters: any) => Promise<any>;
}

export function useOpenAIRealtime(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // Connect to OpenAI Realtime API
  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Get the current port from window.location
      const currentPort = window.location.port || '3000';
      const apiUrl = `http://localhost:${currentPort}/api/realtime-token`;
      
      console.log('Fetching token from:', apiUrl);
      
      // Get client secret from server
      const tokenResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Token fetch error:', errorData);
        throw new Error(errorData.error || 'Failed to get token');
      }
      
      const { client_secret, session_id, api_key } = await tokenResponse.json();
      
      if (!client_secret && !api_key) {
        throw new Error('No authentication token received');
      }
      
      console.log('Got session:', session_id);
      sessionIdRef.current = session_id;
      
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
            sampleRate: 24000,
            channelCount: 1
          }
        });
        mediaStreamRef.current = stream;
        console.log('Microphone access granted');
      } catch (err) {
        console.error('Microphone access denied:', err);
        throw new Error('Mikrofon erişimi gerekli. Lütfen izin verin.');
      }
      
      // Connect to OpenAI Realtime WebSocket 
      const authToken = api_key || client_secret;
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
      console.log('Connecting to WebSocket:', wsUrl);
      console.log('Using auth token:', authToken.substring(0, 10) + '...');
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connection opened');
        
        // İlk olarak authentication ve session configuration mesajı gönder
        const authMessage = {
          type: 'session.update',
          session: {
            authorization: `Bearer ${authToken}`,
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
              
              Her zaman Türkçe konuş ve anlaşılır ol.`,
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
            }
          }
        };
        
        console.log('Sending authentication message:', JSON.stringify(authMessage, null, 2));
        ws.send(JSON.stringify(authMessage));
        
        setIsConnected(true);
        config.onConnect?.();
        
        // Start audio streaming
        if (mediaStreamRef.current && audioContextRef.current) {
          startAudioStream(ws);
        }
      };
      
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'error':
              console.error('WebSocket error message:', data.error);
              setError(data.error.message);
              config.onError?.(new Error(data.error.message));
              break;
              
            case 'session.created':
              console.log('Session created successfully');
              break;
              
            case 'session.updated':
              console.log('Session updated');
              break;
              
            case 'input_audio_buffer.speech_started':
              setIsListening(true);
              console.log('Speech started');
              break;
              
            case 'input_audio_buffer.speech_stopped':
              setIsListening(false);
              console.log('Speech stopped');
              break;
              
            case 'conversation.item.input_audio_transcription.completed':
              const userTranscript = data.transcript;
              setTranscript(userTranscript);
              config.onTranscript?.(userTranscript, true);
              console.log('User said:', userTranscript);
              break;
              
            case 'response.audio_transcript.delta':
              // Assistant is speaking
              setIsSpeaking(true);
              break;
              
            case 'response.audio_transcript.done':
              // Assistant finished speaking
              setIsSpeaking(false);
              break;
              
            case 'response.function_call_arguments.started':
              console.log('Function call started:', data.name);
              break;
              
            case 'response.function_call_arguments.done':
              console.log('Function call completed:', data.name);
              if (config.onToolCall) {
                try {
                  const args = JSON.parse(data.arguments);
                  const result = await config.onToolCall(data.name, args);
                  
                  // Send function result back
                  ws.send(JSON.stringify({
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: data.call_id,
                      output: JSON.stringify(result)
                    }
                  }));
                } catch (err) {
                  console.error('Function call error:', err);
                }
              }
              break;
              
            case 'response.done':
              config.onResponse?.(data);
              break;
              
            case 'response.audio.delta':
              // Handle audio playback if needed
              break;
              
            default:
              console.log('Unhandled message type:', data.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      ws.onerror = (event) => {
        console.error('WebSocket error event:', event);
        setError('Bağlantı hatası oluştu');
        config.onError?.(new Error('WebSocket bağlantı hatası'));
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        stopAudioStream();
        config.onDisconnect?.();
      };
      
      wsRef.current = ws;
      
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Bağlantı kurulamadı');
      config.onError?.(err as Error);
    }
  }, [config]);

  // Start streaming audio to WebSocket
  const startAudioStream = (ws: WebSocket) => {
    const audioContext = audioContextRef.current;
    const stream = mediaStreamRef.current;
    
    if (!audioContext || !stream) return;
    
    try {
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert Float32Array to PCM16
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Convert to base64
          const uint8Array = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64Audio = btoa(binary);
          
          // Send audio data
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio
          }));
        }
      };
      
      processorRef.current = processor;
      console.log('Audio streaming started');
    } catch (err) {
      console.error('Error starting audio stream:', err);
    }
  };

  // Stop audio streaming
  const stopAudioStream = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    console.log('Audio streaming stopped');
  };

  // Disconnect
  const disconnect = useCallback(() => {
    stopAudioStream();
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
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
    
    // Trigger response
    wsRef.current.send(JSON.stringify({
      type: 'response.create'
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
