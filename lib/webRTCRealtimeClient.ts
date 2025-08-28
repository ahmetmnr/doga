import { useCallback, useEffect, useRef, useState } from 'react';

export interface RealtimeConfig {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onResponse?: (response: any) => void;
  onToolCall?: (tool: string, parameters: any) => Promise<any>;
}

export function useWebRTCRealtime(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Connect using WebRTC (OpenAI's recommended method for browsers)
  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Get the current port from window.location
      const currentPort = window.location.port || '3000';
      const apiUrl = `http://localhost:${currentPort}/api/realtime-token`;
      
      console.log('🔗 WebRTC: Fetching ephemeral token from:', apiUrl);
      
      // Get ephemeral token for WebRTC
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
        throw new Error('No authentication credentials received for WebRTC');
      }
      
      // Use API key for authentication (not client_secret)
      const authToken = api_key || client_secret;
      
      console.log('🎯 WebRTC: Got session:', session_id);
      console.log('🔑 WebRTC: Using API key:', authToken.substring(0, 10) + '...');
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
        console.log('🎤 WebRTC: Microphone access granted');
      } catch (err) {
        console.error('Microphone access denied:', err);
        throw new Error('Mikrofon erişimi gerekli. Lütfen izin verin.');
      }
      
      // OpenAI Realtime API artık client_secret ile WebSocket bağlantısı kullanıyor
      // WebRTC yerine direkt WebSocket kullanacağız
      console.log('🔗 Connecting to WebSocket with client secret...');
      
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`;
      
      // Client secret'i WebSocket subprotocol olarak gönderelim
      const ws = new WebSocket(wsUrl, [`realtime`, client_secret]);
      
      ws.onopen = () => {
        console.log('📡 WebSocket connection opened with client secret');
        setIsConnected(true);
        config.onConnect?.();
        
        // Session zaten sunucuda oluşturuldu, sadece başlangıç mesajını gönderelim
        ws.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{
              type: 'input_text',
              text: 'Merhaba DOĞA, yarışmaya başlayalım!'
            }]
          }
        }));
        
        ws.send(JSON.stringify({
          type: 'response.create'
        }));
      };
      
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket: Received message:', data.type);
          
          switch (data.type) {
            case 'error':
              console.error('WebRTC API error:', data.error);
              setError(data.error.message);
              config.onError?.(new Error(data.error.message));
              break;
              
            case 'session.created':
            case 'session.updated':
              console.log('✅ WebRTC: Session configured');
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
              console.log('👤 User said:', userTranscript);
              break;
              
            case 'response.audio_transcript.started':
              setIsSpeaking(true);
              break;
              
            case 'response.audio_transcript.done':
              setIsSpeaking(false);
              break;
              
            case 'response.function_call_arguments.done':
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
          }
        } catch (err) {
          console.error('Error parsing WebRTC message:', err);
        }
      };
      
      ws.onerror = (event) => {
        console.error('📡 WebSocket: Connection error:', event);
        setError('WebSocket bağlantı hatası');
        config.onError?.(new Error('WebSocket connection error'));
      };
      
      ws.onclose = (event) => {
        console.log('📡 WebSocket: Connection closed:', event.code, event.reason);
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        config.onDisconnect?.();
      };
      
      console.log('✅ WebSocket: Connection initiated!');
      
    } catch (err) {
      console.error('WebRTC connection error:', err);
      setError(err instanceof Error ? err.message : 'WebRTC bağlantısı kurulamadı');
      config.onError?.(err as Error);
    }
  }, [config]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
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
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.error('WebRTC data channel not ready');
      return;
    }
    
    dataChannelRef.current.send(JSON.stringify({
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
