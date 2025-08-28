// WebRTC connection pooling için utility
interface PooledConnection {
  sessionId: string;
  userId: string;
  connection: any; // WebRTC client referansı
  createdAt: number;
  lastUsed: number;
  isAlive: boolean;
}

export class ConnectionPool {
  private static instance: ConnectionPool;
  private connections: Map<string, PooledConnection> = new Map();
  private maxConnections: number = 50;
  private connectionTTL: number = 30 * 60 * 1000; // 30 dakika
  
  private constructor() {
    // Her 2 dakikada bir dead connection'ları temizle
    setInterval(() => {
      this.cleanupDeadConnections();
    }, 2 * 60 * 1000);
  }
  
  public static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }
  
  addConnection(sessionId: string, userId: string, connection: any): void {
    // Kullanıcının eski connection'ını kapat
    this.closeUserConnections(userId);
    
    // Pool doluysa en eski connection'ı kapat
    if (this.connections.size >= this.maxConnections) {
      this.evictOldestConnection();
    }
    
    this.connections.set(sessionId, {
      sessionId,
      userId,
      connection,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isAlive: true
    });
    
    console.log(`🔗 Added connection to pool: ${sessionId} (${this.connections.size}/${this.maxConnections})`);
  }
  
  getConnection(sessionId: string): any | null {
    const pooled = this.connections.get(sessionId);
    if (pooled && pooled.isAlive) {
      pooled.lastUsed = Date.now();
      return pooled.connection;
    }
    return null;
  }
  
  closeConnection(sessionId: string): void {
    const pooled = this.connections.get(sessionId);
    if (pooled) {
      pooled.isAlive = false;
      if (pooled.connection && typeof pooled.connection.stop === 'function') {
        pooled.connection.stop();
      }
      this.connections.delete(sessionId);
      console.log(`🔌 Closed connection: ${sessionId}`);
    }
  }
  
  closeUserConnections(userId: string): void {
    for (const [sessionId, pooled] of this.connections.entries()) {
      if (pooled.userId === userId && pooled.isAlive) {
        this.closeConnection(sessionId);
      }
    }
  }
  
  private evictOldestConnection(): void {
    let oldestSessionId = '';
    let oldestTime = Date.now();
    
    for (const [sessionId, pooled] of this.connections.entries()) {
      if (pooled.lastUsed < oldestTime) {
        oldestTime = pooled.lastUsed;
        oldestSessionId = sessionId;
      }
    }
    
    if (oldestSessionId) {
      console.log(`🗑️ Evicting oldest connection: ${oldestSessionId}`);
      this.closeConnection(oldestSessionId);
    }
  }
  
  private cleanupDeadConnections(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, pooled] of this.connections.entries()) {
      if (!pooled.isAlive || (now - pooled.lastUsed) > this.connectionTTL) {
        this.closeConnection(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} dead connections`);
    }
  }
  
  getStats(): { total: number; alive: number; maxConnections: number } {
    let alive = 0;
    for (const pooled of this.connections.values()) {
      if (pooled.isAlive) alive++;
    }
    
    return {
      total: this.connections.size,
      alive,
      maxConnections: this.maxConnections
    };
  }
}
