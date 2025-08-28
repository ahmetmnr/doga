"""
OpenAI Realtime API - FastAPI Backend Example
Bu örnek, FastAPI kullanarak OpenAI Realtime API için backend server oluşturmayı gösterir
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime
import base64
import wave
import io

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import websockets
import redis
import uvicorn

# Logging setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="OpenAI Realtime API Backend",
    description="Backend server for OpenAI Realtime API integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Redis client for session management
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Models
class SessionConfig(BaseModel):
    modalities: List[str] = ["text", "audio"]
    instructions: str = "Sen yardımcı bir asistansın. Türkçe konuş ve kısa, net yanıtlar ver."
    voice: str = "alloy"
    input_audio_format: str = "pcm16"
    output_audio_format: str = "pcm16"
    turn_detection: Optional[Dict] = None
    tools: List[Dict] = []

class TextMessage(BaseModel):
    text: str
    session_id: str

class TokenRequest(BaseModel):
    session_id: str
    ttl_seconds: int = 600

class TokenResponse(BaseModel):
    token: str
    expires_at: str

# Connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.openai_connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.session_configs: Dict[str, SessionConfig] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"Client connected: {session_id}")
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.openai_connections:
            asyncio.create_task(self.openai_connections[session_id].close())
            del self.openai_connections[session_id]
        if session_id in self.session_configs:
            del self.session_configs[session_id]
        logger.info(f"Client disconnected: {session_id}")
    
    async def send_to_client(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send message to client {session_id}: {e}")
    
    async def send_to_openai(self, session_id: str, message: dict):
        if session_id in self.openai_connections:
            try:
                await self.openai_connections[session_id].send(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send message to OpenAI {session_id}: {e}")

manager = ConnectionManager()

# Helper functions
def get_api_key():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return api_key

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Basit token doğrulama - production'da daha güvenli olmalı
    expected_token = os.getenv("API_TOKEN", "your-secret-token")
    if credentials.credentials != expected_token:
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials.credentials

async def create_openai_connection(session_id: str, api_key: str):
    """OpenAI Realtime API'ye WebSocket bağlantısı oluşturma"""
    try:
        model = "gpt-4o-realtime-preview-2024-12-17"
        url = f"wss://api.openai.com/v1/realtime?model={model}"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "OpenAI-Beta": "realtime=v1"
        }
        
        websocket = await websockets.connect(url, extra_headers=headers)
        manager.openai_connections[session_id] = websocket
        
        logger.info(f"Connected to OpenAI for session: {session_id}")
        return websocket
        
    except Exception as e:
        logger.error(f"Failed to connect to OpenAI: {e}")
        raise

async def handle_openai_messages(session_id: str, openai_ws):
    """OpenAI'den gelen mesajları handling"""
    try:
        async for message in openai_ws:
            try:
                event = json.loads(message)
                
                # Event'i client'a forward etme
                await manager.send_to_client(session_id, event)
                
                # Özel event handling
                if event.get("type") == "session.created":
                    logger.info(f"Session created for {session_id}")
                    
                    # Session konfigürasyonu gönderme
                    if session_id in manager.session_configs:
                        config = manager.session_configs[session_id]
                        session_update = {
                            "type": "session.update",
                            "session": config.dict()
                        }
                        await manager.send_to_openai(session_id, session_update)
                
                elif event.get("type") == "error":
                    logger.error(f"OpenAI error for {session_id}: {event.get('error')}")
                
                # Redis'e event kaydetme (opsiyonel)
                redis_key = f"session:{session_id}:events"
                event_data = {
                    "timestamp": datetime.now().isoformat(),
                    "direction": "incoming",
                    "event": event
                }
                redis_client.lpush(redis_key, json.dumps(event_data))
                redis_client.expire(redis_key, 3600)  # 1 saat TTL
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse OpenAI message: {e}")
            except Exception as e:
                logger.error(f"Error handling OpenAI message: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"OpenAI connection closed for session: {session_id}")
    except Exception as e:
        logger.error(f"Error in OpenAI message handler: {e}")

# API Endpoints

@app.post("/api/token", response_model=TokenResponse)
async def create_session_token(
    request: TokenRequest,
    token: str = Depends(verify_token)
):
    """Temporary session token oluşturma"""
    try:
        # Basit token oluşturma - production'da daha güvenli olmalı
        session_token = f"sess_{request.session_id}_{datetime.now().timestamp()}"
        expires_at = datetime.now().timestamp() + request.ttl_seconds
        
        # Redis'e token kaydetme
        redis_client.setex(
            f"token:{session_token}",
            request.ttl_seconds,
            json.dumps({
                "session_id": request.session_id,
                "expires_at": expires_at
            })
        )
        
        return TokenResponse(
            token=session_token,
            expires_at=datetime.fromtimestamp(expires_at).isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to create token: {e}")
        raise HTTPException(status_code=500, detail="Failed to create token")

@app.post("/api/sessions/{session_id}/config")
async def configure_session(
    session_id: str,
    config: SessionConfig,
    token: str = Depends(verify_token)
):
    """Session konfigürasyonu ayarlama"""
    try:
        # Default turn detection
        if not config.turn_detection:
            config.turn_detection = {
                "type": "server_vad",
                "threshold": 0.5,
                "prefix_padding_ms": 300,
                "silence_duration_ms": 500
            }
        
        # Default tools
        if not config.tools:
            config.tools = [
                {
                    "type": "function",
                    "name": "get_current_time",
                    "description": "Şu anki zamanı öğren",
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            ]
        
        manager.session_configs[session_id] = config
        
        # Redis'e config kaydetme
        redis_client.setex(
            f"session:{session_id}:config",
            3600,
            json.dumps(config.dict())
        )
        
        return {"status": "success", "message": "Session configured"}
        
    except Exception as e:
        logger.error(f"Failed to configure session: {e}")
        raise HTTPException(status_code=500, detail="Failed to configure session")

@app.post("/api/sessions/{session_id}/message")
async def send_text_message(
    session_id: str,
    message: TextMessage,
    token: str = Depends(verify_token)
):
    """Text mesajı gönderme"""
    try:
        if session_id not in manager.openai_connections:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Text message event oluşturma
        event = {
            "type": "conversation.item.create",
            "item": {
                "type": "message",
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": message.text
                    }
                ]
            }
        }
        
        await manager.send_to_openai(session_id, event)
        
        # Response tetikleme
        response_event = {"type": "response.create"}
        await manager.send_to_openai(session_id, response_event)
        
        return {"status": "success", "message": "Message sent"}
        
    except Exception as e:
        logger.error(f"Failed to send message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")

@app.get("/api/sessions/{session_id}/events")
async def get_session_events(
    session_id: str,
    limit: int = 50,
    token: str = Depends(verify_token)
):
    """Session event'lerini alma"""
    try:
        redis_key = f"session:{session_id}:events"
        events = redis_client.lrange(redis_key, 0, limit - 1)
        
        parsed_events = []
        for event_str in events:
            try:
                parsed_events.append(json.loads(event_str))
            except json.JSONDecodeError:
                continue
        
        return {"events": parsed_events}
        
    except Exception as e:
        logger.error(f"Failed to get events: {e}")
        raise HTTPException(status_code=500, detail="Failed to get events")

# WebSocket endpoint
@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """Main WebSocket endpoint for client connections"""
    await manager.connect(websocket, session_id)
    
    try:
        # OpenAI bağlantısı oluşturma
        api_key = get_api_key()
        openai_ws = await create_openai_connection(session_id, api_key)
        
        # OpenAI mesajlarını handle etmek için task başlatma
        openai_task = asyncio.create_task(
            handle_openai_messages(session_id, openai_ws)
        )
        
        # Client mesajlarını handle etme
        while True:
            try:
                # Client'dan mesaj alma
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # OpenAI'ye forward etme
                await manager.send_to_openai(session_id, message)
                
                # Redis'e event kaydetme
                redis_key = f"session:{session_id}:events"
                event_data = {
                    "timestamp": datetime.now().isoformat(),
                    "direction": "outgoing",
                    "event": message
                }
                redis_client.lpush(redis_key, json.dumps(event_data))
                redis_client.expire(redis_key, 3600)
                
            except WebSocketDisconnect:
                logger.info(f"Client disconnected: {session_id}")
                break
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON from client: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "error": {"message": "Invalid JSON format"}
                }))
            except Exception as e:
                logger.error(f"Error handling client message: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "error": {"message": str(e)}
                }))
    
    except Exception as e:
        logger.error(f"WebSocket error for {session_id}: {e}")
    
    finally:
        # Cleanup
        openai_task.cancel()
        manager.disconnect(session_id)

# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "active_sessions": len(manager.active_connections)
    }

# Audio utilities
class AudioProcessor:
    @staticmethod
    def pcm16_to_wav(pcm_data: bytes, sample_rate: int = 24000) -> bytes:
        """PCM16 data'yı WAV formatına dönüştürme"""
        output = io.BytesIO()
        
        with wave.open(output, 'wb') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)  # 16-bit
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(pcm_data)
        
        return output.getvalue()
    
    @staticmethod
    def wav_to_pcm16(wav_data: bytes) -> bytes:
        """WAV data'yı PCM16'ya dönüştürme"""
        input_stream = io.BytesIO(wav_data)
        
        with wave.open(input_stream, 'rb') as wav_file:
            if wav_file.getnchannels() != 1:
                raise ValueError("Only mono audio is supported")
            if wav_file.getsampwidth() != 2:
                raise ValueError("Only 16-bit audio is supported")
            
            return wav_file.readframes(wav_file.getnframes())

# Function call handlers
class FunctionCallHandler:
    @staticmethod
    def get_current_time() -> str:
        """Şu anki zamanı döndürme"""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    @staticmethod
    def calculate(expression: str) -> str:
        """Basit hesaplama yapma"""
        try:
            # Güvenlik için sadece basit matematiksel ifadelere izin ver
            allowed_chars = set("0123456789+-*/.() ")
            if not all(c in allowed_chars for c in expression):
                return "Hata: Sadece sayılar ve temel matematiksel operatörler kullanılabilir"
            
            result = eval(expression)
            return str(result)
        except Exception as e:
            return f"Hesaplama hatası: {str(e)}"

if __name__ == "__main__":
    # Environment variables
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    # Run server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )

"""
Usage:

1. Environment variables ayarlama:
   export OPENAI_API_KEY="your-openai-api-key"
   export API_TOKEN="your-secret-token"

2. Dependencies kurma:
   pip install fastapi uvicorn websockets redis pydantic

3. Redis başlatma:
   redis-server

4. Server başlatma:
   python fastapi_backend.py

5. Client bağlantısı:
   ws://localhost:8000/ws/session_123

6. API kullanımı:
   POST /api/token - Session token oluşturma
   POST /api/sessions/{session_id}/config - Session konfigürasyonu
   POST /api/sessions/{session_id}/message - Text mesajı gönderme
   GET /api/sessions/{session_id}/events - Event geçmişi alma
   GET /health - Health check
"""

