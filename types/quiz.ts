export interface Question {
  id: string;
  type: 'mcq' | 'open';
  question: string;
  options?: string[];
  correct?: string;
  openEval?: {
    keywordsAny: string[];
    regexAny?: string[];
    minHits: number;
  };
  points: number;
  miniCorpus: string;
}

export interface Participant {
  name: string;
  email: string;
  phone: string;
  optIn: boolean;
}

export interface GameState {
  sessionId: string;
  participant?: Participant;
  currentQuestionIndex: number;
  score: number;
  answers: Answer[];
  status: 'registration' | 'playing' | 'finished';
}

export interface Answer {
  questionId: string;
  answer: string;
  correct: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  date: string;
}
