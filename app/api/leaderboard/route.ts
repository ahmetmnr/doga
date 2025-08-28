import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const scoresPath = path.join(process.cwd(), 'data', 'scores.json');

export async function GET() {
  try {
    let scores = [];
    
    try {
      const data = await fs.readFile(scoresPath, 'utf-8');
      scores = JSON.parse(data);
    } catch {
      // File doesn't exist yet
      scores = [];
    }
    
    // Return top 10 scores
    const topScores = scores.slice(0, 10).map((score: any, index: number) => ({
      rank: index + 1,
      name: score.name,
      score: score.score,
      date: score.date
    }));
    
    return NextResponse.json(topScores);
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to read leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, score } = await req.json();
    
    if (!name || !email || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    let scores = [];
    
    try {
      const data = await fs.readFile(scoresPath, 'utf-8');
      scores = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }
    
    scores.push({
      name,
      email,
      score,
      date: new Date().toISOString()
    });
    
    // Sort by score (highest first)
    scores.sort((a: any, b: any) => b.score - a.score);
    
    // Keep only top 100 scores
    scores = scores.slice(0, 100);
    
    await fs.writeFile(scoresPath, JSON.stringify(scores, null, 2));
    
    // Find the rank of the new score
    const rank = scores.findIndex((s: any) => 
      s.name === name && s.email === email && s.score === score
    ) + 1;
    
    return NextResponse.json({
      success: true,
      rank,
      totalPlayers: scores.length
    });
  } catch (error) {
    console.error('Error saving score:', error);
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 }
    );
  }
}
