export type Language = 'en' | 'fr';

export type Level = 'A1' | 'A2' | 'B1';

export type StudyMode = 'guide' | 'repaso' | 'simulacro' | 'tarjetas';

export type VoiceMode = 'es-CO' | 'en' | 'fr' | 'mixed-en' | 'mixed-fr';

export interface GrammarExample {
  target: string;
  spanish: string;
  note?: string;
}

export interface GrammarPoint {
  title: string;
  formula?: string;
  tip: string;
  examples: GrammarExample[];
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  phoneticHint?: string;
  example: string;
  exampleEs: string;
}

export interface ChoiceQuestion {
  id: string;
  type: 'choice';
  difficulty: 1 | 2 | 3;
  promptEs: string;
  sentenceTarget?: string;
  audioText?: string;
  options: string[];
  correctIndex: number;
  hintEs: string;
  clueHighlight?: string;
  explanationEs: string;
  spokenAnswerTarget: string;
}

export interface FillQuestion {
  id: string;
  type: 'fill';
  difficulty: 1 | 2 | 3;
  promptEs: string;
  sentenceBefore: string;
  sentenceAfter: string;
  wordBank: string[];
  answer: string;
  audioText?: string;
  hintEs: string;
  explanationEs: string;
  spokenAnswerTarget: string;
}

export interface OrderQuestion {
  id: string;
  type: 'order';
  difficulty: 1 | 2 | 3;
  promptEs: string;
  spanishMeaning: string;
  words: string[];
  correctSentence: string;
  hintEs: string;
  explanationEs: string;
  spokenAnswerTarget: string;
}

export interface ListenQuestion {
  id: string;
  type: 'listen';
  difficulty: 1 | 2 | 3;
  promptEs: string;
  audioText: string;
  options: string[];
  correctIndex: number;
  transcript: string;
  hintEs: string;
  explanationEs: string;
  spokenAnswerTarget: string;
}

export type Question =
  | ChoiceQuestion
  | FillQuestion
  | OrderQuestion
  | ListenQuestion;

export interface Topic {
  id: string;
  slug: string;
  language: Language;
  level: Level;
  order: number;
  priorityFirst: boolean;
  titleEs: string;
  titleTarget: string;
  shortDescEs: string;
  category: string;
  estimatedMinutes: number;
  accentColor: 'coral' | 'cobalt' | 'emerald' | 'amber' | 'plum';
  keywords: string[];
  microGuide: GrammarPoint[];
  commonMistake: {
    wrong: string;
    right: string;
    whyEs: string;
  };
  flashcards: FlashcardItem[];
  questions: Question[];
}

export interface TopicProgress {
  attempts: number;
  correct: number;
  masteryPct: number;
  lastReviewedAt?: string;
  completedSessions: number;
}

export interface BadgeDefinition {
  id: string;
  titleEs: string;
  descEs: string;
  tone: 'coral' | 'cobalt' | 'emerald' | 'amber' | 'plum';
}

export interface UserProgress {
  xp: number;
  streakDays: number;
  lastStudyDate: string | null;
  topicStats: Record<string, TopicProgress>;
  missedQuestionIds: string[];
  masteredFlashcardIds: string[];
  favorites: string[];
  unlockedBadges: string[];
  simulacrosCompleted: number;
  voiceMuted: boolean;
  voiceSlow: boolean;
}

export interface SimulacroConfig {
  language: Language | 'both';
  level: Level | 'all';
  topicSlug?: string;
  questionCount: 10 | 15 | 20;
  timerMinutes: 0 | 5 | 10 | 15;
}
