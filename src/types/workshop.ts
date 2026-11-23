export type WorkshopSheetId = 'pdf1' | 'pdf2';

export interface CompoundPatternRule {
  id: string;
  pattern: string;
  patternEs: string;
  sentenceBefore: string;
  highlight: string;
  sentenceAfter: string;
  explanationEs: string;
}

export type ExerciseKind =
  | 'transform'
  | 'pair-match'
  | 'gap-fill-bank'
  | 'two-box-builder'
  | 'open-compound-input'
  | 'half-fill-and-answer'
  | 'half-fill-plus-examples'
  | 'open-speaking-writing';

export interface BaseWorkshopExercise {
  id: string;
  sheetId: WorkshopSheetId;
  sectionId: string;
  number: number;
  kind: ExerciseKind;
  promptEs: string;
  imagePath: string;
  imageCaptionEs: string;
  progressiveHints: [string, string, string];
  feedbackEs: string;
  commonTrapEs: string;
  spokenEnglish: string;
}

export interface TransformExercise extends BaseWorkshopExercise {
  kind: 'transform';
  sourcePhrase: string;
  patternLabel: string;
  acceptedAnswers: string[];
  displayAnswer: string;
  scaffoldChips: string[];
}

export interface PairMatchExercise extends BaseWorkshopExercise {
  kind: 'pair-match';
  leftWord: string;
  correctLetter: string;
  correctRightWord: string;
  combinedAdjective: string;
  exampleSentence: string;
}

export interface GapFillBankExercise extends BaseWorkshopExercise {
  kind: 'gap-fill-bank';
  grammarTypeLabel?: string;
  sentenceBefore: string;
  sentenceAfter: string;
  acceptedAnswers: string[];
  displayAnswer: string;
}

export interface TwoBoxBuilderExercise extends BaseWorkshopExercise {
  kind: 'two-box-builder';
  sentenceBefore: string;
  sentenceAfter: string;
  expectedLeft: string;
  expectedRight: string;
  displayAnswer: string;
}

export interface OpenCompoundInputExercise extends BaseWorkshopExercise {
  kind: 'open-compound-input';
  sentenceBefore: string;
  sentenceAfter: string;
  acceptedAnswers: string[];
  displayAnswer: string;
  scaffoldChips: string[];
}

export interface HalfFillSlot {
  textBefore: string;
  expectedHalf: string;
  acceptedHalves: string[];
  textAfter: string;
  prefixShown?: string;
  suffixShown?: string;
}

export interface HalfFillAndAnswerExercise extends BaseWorkshopExercise {
  kind: 'half-fill-and-answer';
  slots: HalfFillSlot[];
  discussionPromptEs: string;
  sampleResponse: string;
  suggestedChips: string[];
}

export interface HalfFillPlusExamplesExercise extends BaseWorkshopExercise {
  kind: 'half-fill-plus-examples';
  numberLabel: string;
  prefix: string;
  suffix: string;
  textAfterPrompt: string;
  expectedMissingWord: string;
  acceptedMissingWords: string[];
  suggestedExamples: string[];
}

export interface OpenSpeakingWritingExercise extends BaseWorkshopExercise {
  kind: 'open-speaking-writing';
  taskEnglish: string;
  taskEs: string;
  guidingQuestionsEs: string[];
  suggestedAdjectives: string[];
  sampleParagraph: string;
}

export type WorkshopExercise =
  | TransformExercise
  | PairMatchExercise
  | GapFillBankExercise
  | TwoBoxBuilderExercise
  | OpenCompoundInputExercise
  | HalfFillAndAnswerExercise
  | HalfFillPlusExamplesExercise
  | OpenSpeakingWritingExercise;

export interface PairOption {
  letter: string;
  word: string;
}

export interface WorkshopSection {
  id: string;
  letter: string;
  titleEs: string;
  instructionEn: string;
  instructionEs: string;
  pairOptions?: PairOption[];
  wordBank?: string[];
  boxLeftWords?: string[];
  boxRightWords?: string[];
  exercises: WorkshopExercise[];
}

export interface WorkshopSheet {
  id: WorkshopSheetId;
  shortTitle: string;
  titleEs: string;
  sourceLabel: string;
  levelLabel: string;
  descriptionEs: string;
  sections: WorkshopSection[];
}
