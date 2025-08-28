import { useCallback, useEffect, useRef, useState } from 'react';

export interface RealtimeEvent {
  type: string;
  [key: string]: any;
}

export interface RealtimeConfig {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onToolCall?: (tool: string, parameters: any) => Promise<any>;
  onResponse?: (response: any) => void;
}

export function useRealtimeAPI(config: RealtimeConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string>('');

  // Initialize audio context
  const initAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    
    try {
      // Get user microphone with noise suppression
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        }
      });
      
      audioStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      throw err;
    }
  }, []);

  // Connect to OpenAI Realtime API
  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Get ephemeral token
      const tokenResponse = await fetch('/api/realtime-token');
      const { token, sessionId } = await tokenResponse.json();
      
      if (!token) {
        throw new Error('Failed to get session token');
      }
      
      sessionIdRef.current = sessionId;
      
      // Initialize audio
      const audioStream = await initAudioContext();
      
      // Create WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Add audio track
      audioStream.getTracks().forEach(track => {
        pc.addTrack(track, audioStream);
      });
      
      // Create data channel for events
      const dataChannel = pc.createDataChannel('events', {
        ordered: true
      });
      
      dataChannel.onopen = () => {
        console.log('Data channel opened');
        setIsConnected(true);
        config.onConnect?.();
        
        // Send initial configuration
        dataChannel.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        }));
      };
      
      dataChannel.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        handleRealtimeEvent(data);
      };
      
      dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
        setError('Connection error');
        config.onError?.(new Error('Data channel error'));
      };
      
      // Handle incoming audio
      pc.ontrack = (event) => {
        if (event.track.kind === 'audio') {
          const audio = new Audio();
          audio.srcObject = event.streams[0];
          audio.autoplay = true;
          
          // Handle audio events
          audio.onplay = () => {
            setIsSpeaking(true);
            config.onAudioStart?.();
          };
          
          audio.onended = () => {
            setIsSpeaking(false);
            config.onAudioEnd?.();
          };
        }
      };
      
      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Connect to OpenAI WebRTC endpoint
      const response = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'session.create',
          model: 'gpt-4o-realtime-preview-2024-12-17',
          sdp: offer.sdp
        })
      });
      
      const answer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: answer.sdp
      }));
      
      pcRef.current = pc;
      dataChannelRef.current = dataChannel;
      
    } catch (err) {
      console.error('Connection error:', err);
      setError('Failed to connect to voice assistant');
      config.onError?.(err as Error);
    }
  }, [config, initAudioContext]);

  // Handle realtime events
  const handleRealtimeEvent = useCallback(async (event: RealtimeEvent) => {
    switch (event.type) {
      case 'conversation.item.input_audio_transcription.completed':
        const userTranscript = event.transcript;
        setTranscript(userTranscript);
        config.onTranscript?.(userTranscript, true);
        break;
        
      case 'conversation.item.input_audio_transcription.partial':
        const partialTranscript = event.transcript;
        setTranscript(partialTranscript);
        config.onTranscript?.(partialTranscript, false);
        break;
        
      case 'response.audio.started':
        setIsSpeaking(true);
        config.onAudioStart?.();
        break;
        
      case 'response.audio.done':
        setIsSpeaking(false);
        config.onAudioEnd?.();
        break;
        
      case 'response.function_call':
        if (config.onToolCall) {
          const result = await config.onToolCall(event.name, event.arguments);
          
          // Send tool response back
          dataChannelRef.current?.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              function_call_output: {
                call_id: event.call_id,
                output: JSON.stringify(result)
              }
            }
          }));
        }
        break;
        
      case 'response.done':
        config.onResponse?.(event.response);
        break;
        
      case 'error':
        console.error('Realtime error:', event.error);
        setError(event.error.message);
        config.onError?.(new Error(event.error.message));
        break;
    }
  }, [config]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
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
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      console.error('Data channel not ready');
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

  // Interrupt current response
  const interrupt = useCallback(() => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      return;
    }
    
    dataChannelRef.current.send(JSON.stringify({
      type: 'response.cancel'
    }));
    
    setIsSpeaking(false);
  }, []);

  // Start listening
  const startListening = useCallback(() => {
    setIsListening(true);
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    setIsListening(false);
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
    sendMessage,
    interrupt,
    startListening,
    stopListening
  };
}
