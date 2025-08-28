import { NextResponse } from 'next/server';
import { SessionManager } from '@/lib/sessionManager';

export async function GET() {
  try {
    const sessionManager = SessionManager.getInstance();
    const stats = sessionManager.getSessionStats();
    
    return NextResponse.json({
      sessions: stats,
      timestamp: new Date().toISOString(),
      message: `Active sessions: ${stats.active}, Total: ${stats.total}`
    });
    
  } catch (error) {
    console.error('Session stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get session stats' },
      { status: 500 }
    );
  }
}
