'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import Avatar from '@/components/Avatar';
import QuestionPanel from '@/components/QuestionPanel';
import ProgressBar from '@/components/ProgressBar';
import Leaderboard from '@/components/Leaderboard';
import { useOpenAIRealtime } from '@/lib/useOpenAIRealtime';
import { Question, GameState } from '@/types/quiz';
import questionsData from '@/data/questions.json';

interface UserInfo {
  name: string;
  email: string;
  phone: string;
  optIn: boolean;
}

interface QuizInterfaceProps {
  userInfo: UserInfo;
  onExit: () => void;
}

export default function QuizInterface({ userInfo, onExit }: QuizInterfaceProps) {
  // Her QuizInterface açılışında state'leri sıfırla
  const [gameState, setGameState] = useState<GameState>(() => ({
    sessionId: '',
    participant: userInfo,
    currentQuestionIndex: 0,
    score: 0,
    answers: [],
    status: 'playing'
  }));
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  
  // Component mount olduğunda tüm state'leri sıfırla
  useEffect(() => {
    console.log('🔄 QuizInterface mounted - resetting all states');
    setGameState({
      sessionId: '',
      participant: userInfo,
      currentQuestionIndex: 0,
      score: 0,
      answers: [],
      status: 'playing'
    });
    setCurrentQuestion(null);
    setIsStarted(false);
  }, [userInfo]);
  
  const questions = questionsData as Question[];
  const totalPossibleScore = questions.reduce((sum, q) => sum + q.points, 0);
  
  // Tool handler for Realtime API
  const handleToolCall = useCallback(async (tool: string, parameters: any) => {
    console.log('🛠️ Tool call:', tool, parameters);
    
    try {
      const response = await fetch('/api/voice/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool,
          parameters: {
            ...parameters,
            email: userInfo.email // User ID için
          },
          sessionId: sessionId || `temp_${Date.now()}` // Hook'tan gelen gerçek sessionId
        })
      });
      
      const result = await response.json();
      console.log('🔄 Tool result:', result);
      
      // Update local state based on tool response
      switch (tool) {
        case 'save_participant_profile':
          // Bilgiler zaten var, yarışmaya geç
          setGameState(prev => ({ ...prev, status: 'playing' }));
          break;
          
        case 'get_active_question':
          if (result.question) {
            // Tool'dan gelen ham veriyi Question tipine çevir
            const questionData = {
              id: result.questionId,
              type: result.questionType,
              question: result.question,
              options: result.options,
              points: questions.find(q => q.id === result.questionId)?.points || 10,
              miniCorpus: questions.find(q => q.id === result.questionId)?.miniCorpus || ''
            };
            setCurrentQuestion(questionData);
            setGameState(prev => ({
              ...prev,
              currentQuestionIndex: result.questionNumber - 1
            }));
          }
          break;
          
        case 'next_question':
          if (result.finished) {
            setGameState(prev => ({ ...prev, status: 'finished' }));
            setCurrentQuestion(null);
          } else if (result.question) {
            // Tool'dan gelen ham veriyi Question tipine çevir
            const questionData = {
              id: result.questionId,
              type: result.questionType,
              question: result.question,
              options: result.options,
              points: questions.find(q => q.id === result.questionId)?.points || 10,
              miniCorpus: questions.find(q => q.id === result.questionId)?.miniCorpus || ''
            };
            setCurrentQuestion(questionData);
            setGameState(prev => ({
              ...prev,
              currentQuestionIndex: result.questionNumber - 1
            }));
          }
          break;
          
        case 'grade_answer':
          if (!result.needsConfirmation) {
            setGameState(prev => ({
              ...prev,
              score: result.currentScore,
              answers: [...prev.answers, {
                questionId: parameters.questionId,
                answer: parameters.transcript,
                correct: result.correct
              }]
            }));
          }
          break;
          
        case 'end_quiz':
          setGameState(prev => ({
            ...prev,
            status: 'finished',
            score: result.finalScore
          }));
          setCurrentQuestion(null);
          
          // Save score to leaderboard
          await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: userInfo.name,
              email: userInfo.email,
              score: result.finalScore
            })
          });
          
          // Auto exit after 5 seconds
          setTimeout(() => {
            onExit();
          }, 5000);
          break;
      }
      
      return result;
    } catch (error) {
      console.error('Tool execution error:', error);
      return { error: 'Tool execution failed' };
    }
  }, [userInfo, questions, onExit]); // sessionId'yi kaldırdık
  
  const {
    isConnected,
    isListening,
    isSpeaking,
    transcript,
    error,
    sessionId,
    gamePhase,
    hasParticipantInfo,
    isResponseActive,
    connect,
    disconnect,
    interruptResponse,
    clearError
  } = useOpenAIRealtime({
    userInfo: userInfo, // Kullanıcı bilgilerini hook'a geç
    onConnect: () => {
      console.log('Connected to DOĞA');
      setGameState(prev => ({ ...prev, sessionId: sessionId }));
    },
    onDisconnect: () => {
      console.log('Disconnected from DOĞA');
      setIsStarted(false);
    },
    onError: (err) => {
      console.error('Realtime API error:', err);
    },
    onTranscript: (text, isFinal) => {
      console.log('Transcript:', text, 'Final:', isFinal);
    },
    onToolCall: (tool: string, parameters: any) => handleToolCall(tool, parameters),
    onResponse: (response) => {
      console.log('Response:', response);
    }
  });
  
  const handleStart = async () => {
    if (!isStarted) {
      setIsStarted(true);
      await connect();
      
      // DOĞA bağlandıktan sonra kullanıcı bilgilerini otomatik kaydet
      setTimeout(() => {
        console.log('🔄 Auto-saving user info after connection...');
        handleToolCall('save_participant_profile', userInfo);
      }, 3000); // DOĞA hoş geldin dedikten sonra
    }
  };
  
  const handleStop = () => {
    if (isStarted) {
      setIsStarted(false);
      disconnect();
      onExit();
    }
  };
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-green-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Geri Dön
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-2">
              Merhaba {userInfo.name}!
            </h1>
            <p className="text-gray-600">
              DOĞA ile Sıfır Atık Yarışmasına Hoş Geldiniz
            </p>
          </div>
          
          <div className="w-20"></div> {/* Spacer for center alignment */}
        </div>
        
        {/* Main content grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left column - Progress */}
          <div className="col-span-3">
            <ProgressBar
              currentQuestion={gameState.currentQuestionIndex + 1}
              totalQuestions={questions.length}
              answers={gameState.answers}
              currentScore={gameState.score}
              totalPossibleScore={totalPossibleScore}
            />
          </div>
          
          {/* Center column - Main content */}
          <div className="col-span-6 space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              <Avatar isListening={isListening} isSpeaking={isSpeaking} />
            </div>
            
            {/* Question Panel */}
            <QuestionPanel
              question={currentQuestion}
              questionNumber={gameState.currentQuestionIndex + 1}
              totalQuestions={questions.length}
            />
            
            {/* Control Buttons */}
            <div className="flex justify-center gap-4">
              {!isStarted ? (
                <button
                  onClick={handleStart}
                  className="btn-primary flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  🎤 DOĞA ile Yarışmaya Başla
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="btn-danger flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  🔚 Yarışmayı Sonlandır
                </button>
              )}
            </div>
            
            {/* Status and error messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 animate-slide-up">
                <p className="font-semibold">Hata:</p>
                <p>{error}</p>
              </div>
            )}
            
            {isConnected && (
              <div className="text-center text-sm text-gray-500 animate-fade-in">
                <p>🎤 Mikrofon {isListening ? 'açık' : 'kapalı'}</p>
                <p className="mt-1">
                  {gamePhase === 'registration' && 'DOĞA size hoş geldiniz diyor...'}
                  {gamePhase === 'quiz' && 'Yarışma devam ediyor - soruları cevaplayın'}
                  {gamePhase === 'finished' && 'Yarışma tamamlandı! 5 saniye sonra çıkış...'}
                </p>
                <p className="text-xs mt-1 opacity-70">
                  {isResponseActive ? '🔄 DOĞA konuşuyor...' : '✅ Dinlemeye hazır'}
                </p>
                {transcript && (
                  <p className="text-xs mt-2 bg-blue-50 rounded p-2">
                    Son söylediğiniz: "{transcript}"
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Right column - Leaderboard */}
          <div className="col-span-3">
            <Leaderboard />
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500 animate-fade-in">
          <p>🌿 Sıfır Atık için El Ele</p>
          <p className="mt-1">Powered by OpenAI Realtime API</p>
        </div>
      </div>
    </main>
  );
}
