// Session yönetimi için utility sınıfı
export interface SessionData {
  sessionId: string;
  userId: string; // Email veya benzersiz ID
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  status: 'active' | 'finished' | 'expired';
}

export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, SessionData> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    // 5 dakikada bir temizlik yap
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }
  
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }
  
  createSession(userId: string, ttlMinutes: number = 30): string {
    // Kullanıcının eski aktif session'ını kapat
    this.closeUserSessions(userId);
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    this.sessions.set(sessionId, {
      sessionId,
      userId,
      createdAt: now,
      expiresAt: now + (ttlMinutes * 60 * 1000),
      lastActivity: now,
      status: 'active'
    });
    
    console.log(`🆕 Created session ${sessionId} for user ${userId}, expires in ${ttlMinutes} minutes`);
    return sessionId;
  }
  
  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'active') {
      session.lastActivity = Date.now();
      return true;
    }
    return false;
  }
  
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'finished';
      console.log(`🔚 Closed session ${sessionId}`);
    }
  }
  
  closeUserSessions(userId: string): void {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId && session.status === 'active') {
        this.closeSession(sessionId);
      }
    }
  }
  
  isValidSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    
    const now = Date.now();
    if (now > session.expiresAt || session.status !== 'active') {
      session.status = 'expired';
      return false;
    }
    
    return true;
  }
  
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt || session.status !== 'active') {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
    }
  }
  
  getSessionStats(): { total: number; active: number; expired: number } {
    const stats = { total: 0, active: 0, expired: 0 };
    
    for (const session of this.sessions.values()) {
      stats.total++;
      if (session.status === 'active') {
        stats.active++;
      } else {
        stats.expired++;
      }
    }
    
    return stats;
  }
  
  // Cleanup on shutdown
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }
}
