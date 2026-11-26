export type ParticipeFamilyKey =
  | '-é'
  | '-i'
  | '-is'
  | '-it'
  | '-ert'
  | '-nt'
  | '-u';

export type ParticipeExerciseKind =
  | 'classify-family'
  | 'spot-correct'
  | 'listen-identify'
  | 'context-fill'
  | 'family-deduction';

export interface ParticipeRule {
  id: string;
  badge: string;
  title: string;
  formula: string;
  warning?: string;
  exampleFr: string;
  exampleEs: string;
}

export interface ParticipeReferenceVerb {
  pdfNumber: number;
  infinitive: string;
  participle: string;
  translationEs: string;
  exampleFr?: string;
  family: ParticipeFamilyKey;
  endingLabel: string;
  note?: string;
  highlighted?: boolean;
}

export interface ClassActivityItem {
  number: number;
  infinitive: string;
  participle: string;
  family: ParticipeFamilyKey;
  hintEs: string;
}

export interface ParticipeOption {
  id: string;
  label: string;
  subLabel?: string;
}

export interface ParticipeSentenceParts {
  before: string;
  after: string;
  auxiliary?: string;
}

export interface ParticipeFamilyModel {
  infinitive: string;
  participle: string;
  ruleNote: string;
}

export interface ParticipeExercise {
  id: string;
  sectionId: string;
  kind: ParticipeExerciseKind;
  numberLabel: string;
  infinitive: string;
  translationEs: string;
  family: ParticipeFamilyKey;
  promptEs: string;
  helperFr?: string;
  sentenceParts?: ParticipeSentenceParts;
  familyModel?: ParticipeFamilyModel;
  options?: ParticipeOption[];
  correctAnswer: string;
  acceptedAnswers: string[];
  spokenFrench: string;
  progressiveHints: [string, string, string];
  feedbackEs: string;
  commonTrapEs?: string;
}

export interface ParticipeSection {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  kind: ParticipeExerciseKind;
  exercises: ParticipeExercise[];
}
