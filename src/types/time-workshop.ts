export type TimePeriod = 'AM' | 'PM';

export type TimeExerciseKind =
  | 'set-clock'
  | 'listen-digital'
  | 'listen-clock'
  | 'write-words'
  | 'reading-digital'
  | 'reading-clock'
  | 'reading-write'
  | 'reading-choice'
  | 'triple-challenge';

export type TimeSkillTag =
  | 'Reloj'
  | 'Escucha'
  | 'Escritura'
  | 'Lectura'
  | 'Integrador 3 en 1';

export interface ReadingCardData {
  title: string;
  subtitle: string;
  style: 'schedule' | 'email' | 'notice' | 'chat' | 'bus';
  lines: string[];
}

export interface TimeWorkshopExercise {
  id: string;
  sectionId: string;
  number: number;
  kind: TimeExerciseKind;
  skillTag: TimeSkillTag;
  contextBadgeEs: string;
  promptEs: string;
  targetHours: number;
  targetMinutes: number;
  targetPeriod?: TimePeriod;
  audioText?: string;
  readingCard?: ReadingCardData;
  showClockInPrompt?: boolean;
  showDigitalInPrompt?: boolean;
  requirePastToStyle?: boolean;
  acceptedPhrases?: string[];
  displayPhrase: string;
  digitalEnglishPhrase: string;
  scaffoldChips?: string[];
  choiceOptions?: string[];
  correctChoiceIndex?: number;
  progressiveHints: [string, string, string];
  feedbackEs: string;
  commonTrapEs: string;
  spokenModelEn: string;
}

export interface TimeWorkshopSection {
  id: string;
  numberLabel: string;
  titleEs: string;
  skillFocusEs: string;
  descriptionEs: string;
  exercises: TimeWorkshopExercise[];
}
