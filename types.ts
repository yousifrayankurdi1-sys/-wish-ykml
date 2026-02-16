
export enum CategoryType {
  SAUDI = 'SAUDI',
  GAMING = 'GAMING',
  RAP = 'RAP',
  FOOD = 'FOOD',
  ANIMALS = 'ANIMALS',
  ANIME = 'ANIME',
  GENERAL = 'GENERAL'
}

export enum GameMode {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface SourceLink {
  uri: string;
  title: string;
}

export interface CompletionAnswer {
  text: string;
  points: number;
  rank: number;
  revealed: boolean;
}

export interface GameQuestion {
  starter: string;
  answers: CompletionAnswer[];
  sources?: SourceLink[];
  timestamp?: number;
}

export interface GameState {
  currentQuestion: GameQuestion | null;
  score: number;
  lives: number;
  timeLeft: number;
  status: 'idle' | 'loading' | 'playing' | 'gameOver';
  category: CategoryType | null;
  mode: GameMode | null;
  lastGuessCorrect: boolean | null;
  funnyResponse: string;
}

export interface AdminStats {
  totalQuestionsGenerated: number;
  averageAiResponseTime: number;
  systemHealth: 'stable' | 'warning' | 'error';
  recentQuestions: GameQuestion[];
}
