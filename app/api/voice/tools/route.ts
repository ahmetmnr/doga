import { NextRequest, NextResponse } from 'next/server';
import questions from '@/data/questions.json';
import qna from '@/data/qna.json';
import { promises as fs } from 'fs';
import path from 'path';
import { SessionManager } from '@/lib/sessionManager';

// Optimized session management
const gameStates = new Map();
const sessionManager = SessionManager.getInstance();

interface GameState {
  sessionId: string;
  participant?: {
    name: string;
    email: string;
    phone: string;
    optIn: boolean;
  };
  currentQuestionIndex: number;
  score: number;
  answers: any[];
  status: 'registration' | 'playing' | 'finished';
  lastAnswer?: string;
  awaitingConfirmation?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const { tool, parameters, sessionId } = await req.json();
    
    // Session validation ve activity update
    const userId = parameters.email || 'anonymous';
    
    // Eğer sessionId "temp_" ile başlıyorsa, kalıcı session oluştur
    let actualSessionId = sessionId;
    if (sessionId.startsWith('temp_')) {
      actualSessionId = sessionManager.createSession(userId, 30);
      console.log(`🔄 Converting temp session ${sessionId} to permanent: ${actualSessionId}`);
    } else if (!sessionManager.isValidSession(sessionId)) {
      // Session geçersizse yeni oluştur
      actualSessionId = sessionManager.createSession(userId, 30);
      console.log(`🔄 Invalid session ${sessionId}, created new: ${actualSessionId}`);
    } else {
      // Valid session - activity güncelle
      sessionManager.updateActivity(sessionId);
    }
    
    // Game state'i al veya oluştur (actualSessionId kullan)
    if (!gameStates.has(actualSessionId)) {
      gameStates.set(actualSessionId, {
        sessionId: actualSessionId,
        currentQuestionIndex: 0,
        score: 0,
        answers: [],
        status: 'registration'
      });
      console.log('🆕 New game state created:', actualSessionId);
    } else if (tool === 'save_participant_profile') {
      // Yeniden başlatma - state'i sıfırla
      console.log('🔄 Resetting game state for restart:', actualSessionId);
      gameStates.set(actualSessionId, {
        sessionId: actualSessionId,
        currentQuestionIndex: 0,
        score: 0,
        answers: [],
        status: 'registration'
      });
    }
    
    const state: GameState = gameStates.get(actualSessionId);
    
    // Tool'a göre işlem yap
    switch (tool) {
      case 'save_participant_profile':
        console.log('📋 Saving participant profile:', parameters);
        state.participant = parameters;
        state.status = 'playing';
        gameStates.set(actualSessionId, state);
        
        return NextResponse.json({
          success: true,
          name: parameters.name,
          phase: 'quiz_ready'
        });

      case 'get_state':
        return NextResponse.json(state);

      case 'get_active_question':
        const currentQuestion = questions[state.currentQuestionIndex];
        console.log('📖 Getting active question:', currentQuestion.id);
        
        return NextResponse.json({
          question: currentQuestion.question,
          questionId: currentQuestion.id,
          questionType: currentQuestion.type,
          options: currentQuestion.options,
          questionNumber: state.currentQuestionIndex + 1,
          totalQuestions: questions.length
        });

      case 'next_question':
        console.log('➡️ Moving to next question...');
        if (state.currentQuestionIndex < questions.length - 1) {
          state.currentQuestionIndex++;
          gameStates.set(actualSessionId, state);
          const nextQuestion = questions[state.currentQuestionIndex];
          
          return NextResponse.json({
            finished: false,
            question: nextQuestion.question,
            questionId: nextQuestion.id,
            questionType: nextQuestion.type,
            options: nextQuestion.options,
            questionNumber: state.currentQuestionIndex + 1,
            totalQuestions: questions.length
          });
        } else {
          // Son soru - yarışmayı bitir
          console.log('🏁 Last question completed, ending quiz...');
          state.status = 'finished';
          gameStates.set(actualSessionId, state);
          
          return NextResponse.json({
            finished: true,
            finalScore: state.score,
            totalPossible: questions.reduce((sum, q) => sum + q.points, 0),
            message: `Yarışma tamamlandı! Toplam puanınız: ${state.score}. Tebrikler! Session şimdi kapanıyor.`,
            shouldEndSession: true
          });
        }

      case 'grade_answer':
        const { questionId, transcript } = parameters;
        const question = questions.find(q => q.id === questionId);
        
        if (!question) {
          return NextResponse.json({ error: 'Soru bulunamadı' });
        }
        
        let isCorrect = false;
        let confidence = 1.0;
        let needsConfirmation = false;
        
        if (question.type === 'mcq') {
          // MCQ cevap kontrolü
          const normalizedAnswer = transcript.toLowerCase().trim();
          
          // Şık harfi kontrolü (A, B, C, D)
          const letterMatch = normalizedAnswer.match(/^[abcd]$/i);
          if (letterMatch) {
            isCorrect = letterMatch[0].toUpperCase() === question.correct;
          } else {
            // Seçenek metni kontrolü
            const selectedOption = question.options.find(opt => 
              normalizedAnswer.includes(opt.substring(3).toLowerCase())
            );
            if (selectedOption) {
              isCorrect = selectedOption[0] === question.correct;
            } else {
              // Düşük güven durumu
              confidence = 0.3;
              needsConfirmation = true;
              state.lastAnswer = transcript;
              state.awaitingConfirmation = true;
            }
          }
        } else if (question.type === 'open') {
          // Açık uçlu soru kontrolü
          const normalizedAnswer = transcript.toLowerCase();
          const { keywordsAny, regexAny, minHits } = question.openEval;
          
          let hitCount = 0;
          
          // Anahtar kelime kontrolü
          for (const keyword of keywordsAny) {
            if (normalizedAnswer.includes(keyword.toLowerCase())) {
              hitCount++;
            }
          }
          
          // Regex kontrolü
          for (const pattern of regexAny || []) {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(normalizedAnswer)) {
              hitCount++;
            }
          }
          
          isCorrect = hitCount >= (minHits || 1);
          
          if (hitCount === 0) {
            confidence = 0.2;
            needsConfirmation = true;
            state.lastAnswer = transcript;
            state.awaitingConfirmation = true;
          }
        }
        
        if (!needsConfirmation) {
          if (isCorrect) {
            state.score += question.points;
            state.answers.push({ questionId, answer: transcript, correct: true });
          } else {
            state.answers.push({ questionId, answer: transcript, correct: false });
          }
          gameStates.set(actualSessionId, state);
        }
        
        // Sonraki soru var mı kontrol et
        const hasNextQuestion = state.currentQuestionIndex < questions.length - 1;
        let nextMessage = '';
        
        if (isCorrect) {
          nextMessage = `${question.miniCorpus} ${question.points} puan kazandınız! Şu anki puanınız: ${state.score}.`;
        } else {
          const correctAnswer = question.type === 'mcq' ? 
            question.options.find(o => o[0] === question.correct) : 
            'Açık uçlu soru';
          nextMessage = `Maalesef bu sefer olmadı. ${question.miniCorpus} Şu anki puanınız: ${state.score}.`;
        }
        
        if (hasNextQuestion) {
          nextMessage += ' Şimdi bir sonraki sorumuza geçelim!';
        } else {
          nextMessage += ' Bu son sorumuzdu. Yarışma tamamlandı!';
        }

        return NextResponse.json({
          correct: isCorrect,
          confidence,
          needsConfirmation,
          pointsEarned: isCorrect ? question.points : 0,
          currentScore: state.score,
          explanation: question.miniCorpus,
          questionNumber: state.currentQuestionIndex + 1,
          totalQuestions: questions.length,
          isLastQuestion: !hasNextQuestion
        });

      case 'confirm_answer':
        if (!state.awaitingConfirmation) {
          return NextResponse.json({ error: 'No pending confirmation' });
        }
        
        const currentQ = questions[state.currentQuestionIndex];
        const wasCorrect = parameters.yesNo;
        
        if (wasCorrect) {
          state.score += currentQ.points;
          state.answers.push({ 
            questionId: currentQ.id, 
            answer: state.lastAnswer, 
            correct: true 
          });
        } else {
          state.answers.push({ 
            questionId: currentQ.id, 
            answer: state.lastAnswer, 
            correct: false 
          });
        }
        
        state.awaitingConfirmation = false;
        state.lastAnswer = undefined;
        gameStates.set(sessionId, state);
        
        return NextResponse.json({
          confirmed: true,
          currentScore: state.score,
          miniCorpus: currentQ.miniCorpus
        });

      case 'answer_user_question':
        const { utterance, question: userQuestionText } = parameters;
        const userQuestion = utterance || userQuestionText || '';
        
        if (!userQuestion) {
          return NextResponse.json({
            answer: 'Sorunuzu anlayamadım, lütfen tekrar eder misiniz?',
            message: 'Yarışmaya devam edelim.'
          });
        }
        
        const normalizedQ = userQuestion.toLowerCase();
        
        // QnA'dan cevap bul
        const matchedQna = qna.find(item => 
          item.patterns.some(pattern => 
            normalizedQ.includes(pattern.toLowerCase())
          )
        );
        
        const answer = matchedQna ? 
          matchedQna.answer : 
          'Bu konuda detaylı bilgim yok ama yarışma sonunda daha fazla bilgi edinebilirsiniz.';
        
        return NextResponse.json({
          answer,
          message: 'Şimdi yarışmaya kaldığımız yerden devam ediyorum.'
        });

      case 'repeat':
        const lastQ = questions[state.currentQuestionIndex];
        return NextResponse.json({
          question: lastQ,
          questionNumber: state.currentQuestionIndex + 1,
          totalQuestions: questions.length
        });

      case 'get_score':
        return NextResponse.json({
          currentScore: state.score,
          questionNumber: state.currentQuestionIndex + 1,
          totalQuestions: questions.length
        });

      case 'end_quiz':
        console.log('🏁 Ending quiz for session:', sessionId);
        state.status = 'finished';
        gameStates.set(sessionId, state);
        
        // Session'ı kapat
        sessionManager.closeSession(sessionId);
        
        // Skoru kaydet
        await saveScore(state);
        
        const totalPossible = questions.reduce((sum, q) => sum + q.points, 0);
        const finalMessage = `Tebrikler! Bu yarışmaya katılarak Sıfır Atık konusundaki bilginizi test ettiniz ve farkındalığınızı artırdınız. Toplam puanınız: ${state.score}/${totalPossible}. 

Unutmayın, Sıfır Atık sadece bir çevre hareketi değil; bu topraklara duyduğumuz vefanın, geleceğe olan borcumuzun adıdır.

Emine Erdoğan Hanımefendi'nin öncülüğünde başlayan bu hareket, artık milyonlarca insanın yaşam tarzı haline geldi. Siz de bu büyük dönüşümün parçası olun. Evde, okulda, işyerinde... Her yerde Sıfır Atık ilkelerini uygulayın.

Çünkü geleceğimiz, bugün attığımız adımlarla şekilleniyor. Birlikte, sıfır atıklı bir Türkiye, yaşanabilir bir dünya inşa ediyoruz. Bu yolculukta bizimle olduğunuz için teşekkürler!`;

        return NextResponse.json({
          finalScore: state.score,
          totalPossible,
          participant: state.participant,
          finalMessage: finalMessage // Ham final metni - DOĞA kendi üslubuyla okuyacak
        });

      default:
        return NextResponse.json({ error: 'Unknown tool' }, { status: 400 });
    }
  } catch (error) {
    console.error('Tool error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to save score
async function saveScore(state: GameState) {
  try {
    const scoresPath = path.join(process.cwd(), 'data', 'scores.json');
    let scores = [];
    
    try {
      const data = await fs.readFile(scoresPath, 'utf-8');
      scores = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }
    
    scores.push({
      name: state.participant?.name,
      email: state.participant?.email,
      score: state.score,
      date: new Date().toISOString(),
      answers: state.answers
    });
    
    // Sort by score
    scores.sort((a: any, b: any) => b.score - a.score);
    
    await fs.writeFile(scoresPath, JSON.stringify(scores, null, 2));
  } catch (error) {
    console.error('Error saving score:', error);
  }
}
