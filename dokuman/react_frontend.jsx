/**
 * OpenAI Realtime API - React Frontend Example
 * Bu örnek, React kullanarak OpenAI Realtime API için frontend oluşturmayı gösterir
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// Audio utilities
class AudioUtils {
  static async getUserMedia() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000,
        },
      });
    } catch (error) {
      console.error('Microphone access failed:', error);
      throw new Error('Mikrofon erişimi gerekli');
    }
  }

  static createAudioElement() {
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.controls = false;
    return audio;
  }

  static async playAudioData(audioData) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Audio playback failed:', error);
    }
  }
}

// WebSocket client for backend communication
class WebSocketClient {
  constructor(url, sessionId) {
    this.url = url;
    this.sessionId = sessionId;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Event handlers
    this.onConnect = null;
    this.onDisconnect = null;
    this.onMessage = null;
    this.onError = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.url}/ws/${this.sessionId}`);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          if (this.onConnect) {
            this.onConnect();
          }
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (this.onMessage) {
              this.onMessage(message);
            }
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };
        
        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          
          if (this.onDisconnect) {
            this.onDisconnect(event.code, event.reason);
          }
          
          // Auto-reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
              this.reconnectAttempts++;
              console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
              this.connect();
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.onError) {
            this.onError(error);
          }
          reject(error);
        };
        
      } catch (error) {
        reject(error);
      }
    });
  }

  send(message) {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}

// Main App component
function App() {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcription, setTranscription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const wsClient = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const audioContext = useRef(null);
  const analyser = useRef(null);
  const microphone = useRef(null);
  const animationFrame = useRef(null);

  // Configuration
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'ws://localhost:8000';
  const SESSION_ID = `session_${Date.now()}`;

  // Initialize WebSocket client
  useEffect(() => {
    wsClient.current = new WebSocketClient(BACKEND_URL, SESSION_ID);
    
    wsClient.current.onConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      console.log('Connected to backend');
    };
    
    wsClient.current.onDisconnect = (code, reason) => {
      setIsConnected(false);
      setIsSessionActive(false);
      setConnectionStatus('disconnected');
      console.log('Disconnected from backend:', code, reason);
    };
    
    wsClient.current.onMessage = handleServerMessage;
    
    wsClient.current.onError = (error) => {
      setError('Bağlantı hatası: ' + error.message);
      setConnectionStatus('error');
    };

    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect();
      }
      stopAudioLevelMonitoring();
    };
  }, []);

  // Handle server messages
  const handleServerMessage = useCallback((message) => {
    console.log('Received message:', message.type);
    
    switch (message.type) {
      case 'session.created':
        setIsSessionActive(true);
        addMessage('system', 'Session başlatıldı');
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        setTranscription(message.transcript);
        addMessage('user', message.transcript);
        break;
        
      case 'response.audio_transcript.delta':
        // Real-time transcript updates
        break;
        
      case 'response.audio_transcript.done':
        addMessage('assistant', message.transcript);
        break;
        
      case 'response.done':
        setIsLoading(false);
        break;
        
      case 'error':
        setError('Server hatası: ' + message.error.message);
        setIsLoading(false);
        break;
        
      default:
        console.log('Unhandled message type:', message.type);
    }
  }, []);

  // Add message to chat
  const addMessage = useCallback((role, content) => {
    const message = {
      id: Date.now(),
      role,
      content,
      timestamp: new Date().toLocaleTimeString('tr-TR'),
    };
    
    setMessages(prev => [...prev, message]);
  }, []);

  // Connect to backend
  const connect = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus('connecting');
      await wsClient.current.connect();
    } catch (error) {
      setError('Bağlantı kurulamadı: ' + error.message);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from backend
  const disconnect = () => {
    if (wsClient.current) {
      wsClient.current.disconnect();
    }
    stopRecording();
    stopAudioLevelMonitoring();
  };

  // Send text message
  const sendTextMessage = async () => {
    if (!inputText.trim() || !isConnected) return;
    
    try {
      setIsLoading(true);
      
      const message = {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: inputText.trim(),
            },
          ],
        },
      };
      
      wsClient.current.send(message);
      
      // Trigger response
      wsClient.current.send({
        type: 'response.create',
      });
      
      addMessage('user', inputText.trim());
      setInputText('');
      
    } catch (error) {
      setError('Mesaj gönderilemedi: ' + error.message);
      setIsLoading(false);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await AudioUtils.getUserMedia();
      
      // Setup audio level monitoring
      setupAudioLevelMonitoring(stream);
      
      // Setup media recorder
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      audioChunks.current = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        await sendAudioData(audioBlob);
        
        // Stop microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.current.start(100); // Collect data every 100ms
      setIsRecording(true);
      
    } catch (error) {
      setError('Kayıt başlatılamadı: ' + error.message);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
      stopAudioLevelMonitoring();
    }
  };

  // Send audio data
  const sendAudioData = async (audioBlob) => {
    try {
      setIsLoading(true);
      
      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Send audio buffer append
      wsClient.current.send({
        type: 'input_audio_buffer.append',
        audio: base64Audio,
      });
      
      // Commit audio buffer
      wsClient.current.send({
        type: 'input_audio_buffer.commit',
      });
      
    } catch (error) {
      setError('Ses gönderilemedi: ' + error.message);
      setIsLoading(false);
    }
  };

  // Setup audio level monitoring
  const setupAudioLevelMonitoring = (stream) => {
    try {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      microphone.current = audioContext.current.createMediaStreamSource(stream);
      
      analyser.current.fftSize = 256;
      microphone.current.connect(analyser.current);
      
      const dataArray = new Uint8Array(analyser.current.frequencyBinCount);
      
      const updateAudioLevel = () => {
        analyser.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(100, (average / 255) * 100));
        
        if (isRecording) {
          animationFrame.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
      
    } catch (error) {
      console.error('Audio level monitoring setup failed:', error);
    }
  };

  // Stop audio level monitoring
  const stopAudioLevelMonitoring = () => {
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
    
    setAudioLevel(0);
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>OpenAI Realtime API Demo</h1>
        <div className={`connection-status ${connectionStatus}`}>
          <span className="status-indicator"></span>
          {connectionStatus === 'connected' && 'Bağlı'}
          {connectionStatus === 'connecting' && 'Bağlanıyor...'}
          {connectionStatus === 'disconnected' && 'Bağlantı Yok'}
          {connectionStatus === 'error' && 'Hata'}
        </div>
      </header>

      <main className="app-main">
        {/* Connection Controls */}
        <div className="connection-controls">
          {!isConnected ? (
            <button 
              onClick={connect} 
              disabled={isLoading}
              className="connect-btn"
            >
              {isLoading ? 'Bağlanıyor...' : 'Bağlan'}
            </button>
          ) : (
            <button 
              onClick={disconnect} 
              className="disconnect-btn"
            >
              Bağlantıyı Kes
            </button>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="chat-container">
          <div className="chat-header">
            <h3>Konuşma</h3>
            <button onClick={clearMessages} className="clear-btn">
              Temizle
            </button>
          </div>
          
          <div className="messages">
            {messages.length === 0 ? (
              <div className="empty-state">
                <p>Henüz mesaj yok. Konuşmaya başlayın!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.role}`}
                >
                  <div className="message-header">
                    <span className="role">
                      {message.role === 'user' ? '👤 Sen' : 
                       message.role === 'assistant' ? '🤖 Asistan' : '⚙️ Sistem'}
                    </span>
                    <span className="timestamp">{message.timestamp}</span>
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="message assistant loading">
                <div className="message-header">
                  <span className="role">🤖 Asistan</span>
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Controls */}
        {isConnected && (
          <div className="input-controls">
            {/* Text Input */}
            <div className="text-input-container">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mesajınızı yazın... (Enter ile gönder)"
                disabled={!isConnected || isLoading}
                rows={3}
              />
              <button
                onClick={sendTextMessage}
                disabled={!inputText.trim() || !isConnected || isLoading}
                className="send-btn"
              >
                📤 Gönder
              </button>
            </div>

            {/* Voice Input */}
            <div className="voice-input-container">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected || isLoading}
                className={`voice-btn ${isRecording ? 'recording' : ''}`}
              >
                {isRecording ? '⏹️ Durdur' : '🎤 Konuş'}
              </button>
              
              {isRecording && (
                <div className="audio-level">
                  <div className="audio-level-bar">
                    <div 
                      className="audio-level-fill"
                      style={{ width: `${audioLevel}%` }}
                    ></div>
                  </div>
                  <span className="audio-level-text">
                    Ses Seviyesi: {Math.round(audioLevel)}%
                  </span>
                </div>
              )}
            </div>

            {/* Live Transcription */}
            {transcription && (
              <div className="transcription">
                <strong>Canlı Transkripsiyon:</strong> {transcription}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>OpenAI Realtime API Demo - React Frontend</p>
        <p>Session ID: {SESSION_ID}</p>
      </footer>
    </div>
  );
}

export default App;

/* CSS Styles (App.css) */
/*
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.app-header h1 {
  color: #333;
  margin: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 500;
}

.connection-status.connected {
  background-color: #d4edda;
  color: #155724;
}

.connection-status.connecting {
  background-color: #fff3cd;
  color: #856404;
}

.connection-status.disconnected {
  background-color: #f8d7da;
  color: #721c24;
}

.connection-status.error {
  background-color: #f8d7da;
  color: #721c24;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
}

.connection-controls {
  text-align: center;
  margin-bottom: 20px;
}

.connect-btn, .disconnect-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.connect-btn {
  background-color: #007bff;
  color: white;
}

.connect-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.disconnect-btn {
  background-color: #dc3545;
  color: white;
}

.disconnect-btn:hover {
  background-color: #c82333;
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message button {
  background: none;
  border: none;
  color: #721c24;
  cursor: pointer;
  font-size: 18px;
}

.chat-container {
  background-color: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  min-height: 400px;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chat-header h3 {
  margin: 0;
  color: #333;
}

.clear-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.clear-btn:hover {
  background-color: #545b62;
}

.messages {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 10px;
}

.empty-state {
  text-align: center;
  color: #6c757d;
  padding: 40px;
}

.message {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  max-width: 80%;
}

.message.user {
  background-color: #007bff;
  color: white;
  margin-left: auto;
}

.message.assistant {
  background-color: white;
  border: 1px solid #dee2e6;
}

.message.system {
  background-color: #e9ecef;
  color: #495057;
  margin: 0 auto;
  max-width: 60%;
  text-align: center;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  opacity: 0.8;
}

.message-content {
  line-height: 1.4;
}

.loading .message-content {
  display: flex;
  align-items: center;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #6c757d;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.input-controls {
  background-color: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #dee2e6;
}

.text-input-container {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.text-input-container textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  resize: vertical;
  font-family: inherit;
}

.send-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.send-btn:hover:not(:disabled) {
  background-color: #218838;
}

.voice-input-container {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.voice-btn {
  background-color: #17a2b8;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.voice-btn.recording {
  background-color: #dc3545;
  animation: pulse 1s infinite;
}

.voice-btn:hover:not(:disabled) {
  background-color: #138496;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.audio-level {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.audio-level-bar {
  flex: 1;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.audio-level-fill {
  height: 100%;
  background-color: #28a745;
  transition: width 0.1s;
}

.audio-level-text {
  font-size: 14px;
  color: #6c757d;
  white-space: nowrap;
}

.transcription {
  background-color: #e7f3ff;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #007bff;
  font-size: 14px;
}

.app-footer {
  text-align: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
  color: #6c757d;
  font-size: 14px;
}

.app-footer p {
  margin: 4px 0;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .app {
    padding: 10px;
  }
  
  .app-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .text-input-container {
    flex-direction: column;
  }
  
  .voice-input-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .audio-level {
    flex-direction: column;
    gap: 8px;
  }
  
  .message {
    max-width: 95%;
  }
}
*/

