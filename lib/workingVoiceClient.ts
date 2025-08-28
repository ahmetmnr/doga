import { useCallback, useEffect, useRef, useState } from 'react';

export interface VoiceConfig {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onResponse?: (response: any) => void;
  onToolCall?: (tool: string, parameters: any) => Promise<any>;
}

export function useWorkingVoiceAPI(config: VoiceConfig) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const sessionIdRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const gameStep = useRef<string>('start');
  const userInfo = useRef<any>({});

  // DOĞA'nın cevapları
  const responses = {
    welcome: "Merhaba! Ben DOĞA, Sıfır Atık Sesli Bilgi Yarışması asistanınızım. Yarışmaya hoş geldiniz! Başlamadan önce bilgilerinizi almam gerekiyor. Lütfen adınızı ve soyadınızı söyleyiniz.",
    askEmail: "Teşekkürler! Şimdi e-posta adresinizi söyleyebilir misiniz?",
    askPhone: "Mükemmel! Telefon numaranızı da alabilir miyim?",
    askConsent: "Son olarak, size SMS ve e-posta ile bilgi gönderebilmemiz için izninizi alabilir miyim? Evet veya hayır diyebilirsiniz.",
    startQuiz: "Harika! Tüm bilgilerinizi aldım. Şimdi 10 soruluk Sıfır Atık yarışmamıza başlıyoruz. Hazır mısınız? İlk soru: Sıfır Atık Projesi hangi yıl başlatıldı? A) 2015, B) 2017, C) 2019, D) 2021",
    correct: "Tebrikler! Doğru cevap. Sıfır Atık Projesi gerçekten de 2017 yılında Çevre ve Şehircilik Bakanlığı tarafından başlatılmıştır. 10 puan kazandınız! Şu anki puanınız: 10",
    wrong: "Maalesef yanlış. Doğru cevap B) 2017 idi. Sıfır Atık Projesi 2017 yılında başlatılmıştır. Şu anki puanınız: 0",
    question2: "İkinci soru: Geri dönüşüm kutularının renklerinden en az ikisini sayınız. Bu açık uçlu bir soru, lütfen cevabınızı söyleyin.",
    q2_correct: "Harika! Doğru cevap. Geri dönüşüm kutularının renkleri şunlardır: Mavi kağıt için, Sarı plastik için, Yeşil cam için, Turuncu ambalaj için kullanılır. 20 puan daha kazandınız!",
    quiz_end: "Yarışma tamamlandı! Toplam puanınız hesaplanıyor ve liderlik tablosuna kaydediliyor. Katılımınız için çok teşekkürler!"
  };

  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Web Speech API desteği kontrolü
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Tarayıcınız ses tanıma özelliğini desteklemiyor. Chrome veya Edge kullanın.');
      }
      
      if (!('speechSynthesis' in window)) {
        throw new Error('Tarayıcınız ses sentezi özelliğini desteklemiyor.');
      }
      
      // Mikrofon izni al
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('🎤 Mikrofon erişimi onaylandı');
      } catch (err) {
        throw new Error('Mikrofon erişimi gerekli. Lütfen izin verin.');
      }
      
      // Speech Recognition kurulumu
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'tr-TR';
      
      recognitionRef.current.onstart = () => {
        console.log('🎤 Ses tanıma başladı');
        setIsListening(true);
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (interimTranscript) {
          setTranscript(interimTranscript);
          config.onTranscript?.(interimTranscript, false);
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
          config.onTranscript?.(finalTranscript, true);
          handleUserInput(finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Ses tanıma hatası:', event.error);
        if (event.error === 'not-allowed') {
          setError('Mikrofon erişimi reddedildi');
        } else {
          setError('Ses tanıma hatası: ' + event.error);
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log('🎤 Ses tanıma durdu');
        setIsListening(false);
        // Otomatik yeniden başlat
        if (isConnected) {
          setTimeout(() => {
            if (recognitionRef.current && isConnected) {
              recognitionRef.current.start();
            }
          }, 1000);
        }
      };
      
      // Speech Synthesis kurulumu
      synthRef.current = window.speechSynthesis;
      
      // Bağlantı başarılı
      sessionIdRef.current = `voice_${Date.now()}`;
      setIsConnected(true);
      config.onConnect?.();
      
      // Hoş geldin mesajı
      setTimeout(() => {
        speakText(responses.welcome);
        gameStep.current = 'name';
      }, 1000);
      
      // Ses tanımayı başlat
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
    } catch (err) {
      console.error('Bağlantı hatası:', err);
      setError(err instanceof Error ? err.message : 'Bağlantı kurulamadı');
      config.onError?.(err as Error);
    }
  }, [config, isConnected]);

  // Kullanıcı girişini işle
  const handleUserInput = async (userText: string) => {
    console.log('👤 Kullanıcı dedi:', userText);
    
    const lowerText = userText.toLowerCase().trim();
    
    switch (gameStep.current) {
      case 'name':
        if (lowerText.length > 2) {
          userInfo.current.name = userText;
          gameStep.current = 'email';
          setTimeout(() => speakText(responses.askEmail), 1000);
        }
        break;
        
      case 'email':
        if (lowerText.includes('@') || lowerText.includes('mail') || lowerText.length > 5) {
          userInfo.current.email = userText;
          gameStep.current = 'phone';
          setTimeout(() => speakText(responses.askPhone), 1000);
        }
        break;
        
      case 'phone':
        if (lowerText.length > 5) {
          userInfo.current.phone = userText;
          gameStep.current = 'consent';
          setTimeout(() => speakText(responses.askConsent), 1000);
        }
        break;
        
      case 'consent':
        const hasConsent = lowerText.includes('evet') || lowerText.includes('tamam') || lowerText.includes('onay');
        userInfo.current.optIn = hasConsent;
        
        // Tool call simülasyonu
        if (config.onToolCall) {
          await config.onToolCall('save_participant_profile', {
            name: userInfo.current.name || 'Test Kullanıcı',
            email: userInfo.current.email || 'test@example.com',
            phone: userInfo.current.phone || '555-0123',
            optIn: hasConsent
          });
        }
        
        gameStep.current = 'quiz';
        setTimeout(() => speakText(responses.startQuiz), 1000);
        break;
        
      case 'quiz':
        // İlk soru cevabı (B şıkkı doğru)
        const isCorrect = lowerText.includes('b') || lowerText.includes('2017') || lowerText.includes('bin yedi');
        
        if (config.onToolCall) {
          await config.onToolCall('grade_answer', {
            questionId: 'q1',
            transcript: userText
          });
        }
        
        const response = isCorrect ? responses.correct : responses.wrong;
        setTimeout(() => speakText(response), 1000);
        
        // İkinci soruya geç
        setTimeout(() => {
          speakText(responses.question2);
          gameStep.current = 'quiz2';
        }, 4000);
        break;
        
      case 'quiz2':
        // İkinci soru (açık uçlu)
        const hasColors = lowerText.includes('mavi') || lowerText.includes('sarı') || 
                         lowerText.includes('yeşil') || lowerText.includes('turuncu');
        
        if (hasColors) {
          setTimeout(() => speakText(responses.q2_correct), 1000);
        }
        
        // Yarışmayı bitir
        setTimeout(() => {
          speakText(responses.quiz_end);
          gameStep.current = 'finished';
          
          if (config.onToolCall) {
            config.onToolCall('end_quiz', {});
          }
        }, 4000);
        break;
    }
  };

  // Sesli konuşma
  const speakText = (text: string) => {
    if (!synthRef.current) return;
    
    console.log('🔊 DOĞA diyor:', text);
    setIsSpeaking(true);
    
    // Mevcut konuşmayı durdur
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    // Türkçe ses seç
    const voices = synthRef.current.getVoices();
    const turkishVoice = voices.find(voice => voice.lang.startsWith('tr')) || voices[0];
    if (turkishVoice) {
      utterance.voice = turkishVoice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Konuşma hatası:', event);
      setIsSpeaking(false);
    };
    
    synthRef.current.speak(utterance);
  };

  const disconnect = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (synthRef.current) {
      synthRef.current.cancel();
      synthRef.current = null;
    }
    
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    gameStep.current = 'start';
    userInfo.current = {};
    config.onDisconnect?.();
  }, [config]);

  const sendMessage = useCallback((text: string) => {
    console.log('📝 Mesaj gönderiliyor:', text);
    handleUserInput(text);
  }, []);

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
    sendMessage
  };
}
