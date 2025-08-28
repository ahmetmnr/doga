import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  console.log('🔑 Creating ephemeral token for OpenAI Realtime API...');
  
  if (!apiKey) {
    console.error('❌ OpenAI API key is not configured');
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 500 }
    );
  }

  try {
    // OpenAI Realtime API için session oluştur (rehberdeki yöntem)
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2025-06-03',
        voice: 'alloy'
      })
    });

    console.log('📡 OpenAI Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ OpenAI API error:', errorData);
      throw new Error(errorData.error?.message || 'Session creation failed');
    }

    const sessionData = await response.json();
    console.log('✅ Session created:', sessionData.id);
    
    // Ephemeral token döndür (rehberdeki format)
    return NextResponse.json({
      client_secret: {
        value: sessionData.client_secret?.value,
        expires_at: sessionData.client_secret?.expires_at
      },
      session_id: sessionData.id,
      model: sessionData.model
    });
    
  } catch (error: any) {
    console.error('❌ Ephemeral token creation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create ephemeral token',
        details: error.message 
      },
      { status: 500 }
    );
  }
}