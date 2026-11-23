import type {
  CompoundPatternRule,
  WorkshopExercise,
  WorkshopSheet,
  WorkshopSheetId,
} from '@/types/workshop';
import { COMPOUND_PDF1_SHEET } from './compound-pdf1';
import { COMPOUND_PDF2_SHEET } from './compound-pdf2';

export const COMPOUND_PATTERNS: CompoundPatternRule[] = [
  {
    id: 'pat-1',
    pattern: 'Number + Noun',
    patternEs: 'Número + Sustantivo (en singular)',
    sentenceBefore: 'A break that takes ten minutes is a',
    highlight: 'ten-minute',
    sentenceAfter: 'break.',
    explanationEs:
      'El número y el sustantivo van unidos por guion antes del nombre, siempre en singular ("minute", no "minutes").',
  },
  {
    id: 'pat-2',
    pattern: 'Adjective + Noun',
    patternEs: 'Adjetivo + Sustantivo',
    sentenceBefore: 'A bike ride over a long distance is a',
    highlight: 'long-distance',
    sentenceAfter: 'bike ride.',
    explanationEs:
      'Adjetivo más sustantivo actuando como un solo modificador con guion delante del sustantivo.',
  },
  {
    id: 'pat-3',
    pattern: 'Adverb + Present Participle',
    patternEs: 'Adverbio + Participio Presente (-ing)',
    sentenceBefore: 'A person who works hard is a',
    highlight: 'hard-working',
    sentenceAfter: 'person.',
    explanationEs:
      'Describe cómo realiza habitualmente la acción ("hard" + "working").',
  },
  {
    id: 'pat-4',
    pattern: 'Noun + Present Participle',
    patternEs: 'Sustantivo + Participio Presente (-ing)',
    sentenceBefore: 'An athlete who breaks records is a',
    highlight: 'record-breaking',
    sentenceAfter: 'athlete.',
    explanationEs:
      'Primero va lo que recibe la acción ("record") y después el verbo terminado en "-ing" ("breaking").',
  },
  {
    id: 'pat-5',
    pattern: 'Noun + Adjective',
    patternEs: 'Sustantivo + Adjetivo',
    sentenceBefore: 'A room that is free from smoke is a',
    highlight: 'smoke-free',
    sentenceAfter: 'room.',
    explanationEs:
      'Muy frecuente con "-free" (sugar-free, fat-free) o cualidades como "world-famous".',
  },
  {
    id: 'pat-6',
    pattern: 'Noun + Past Participle',
    patternEs: 'Sustantivo + Participio Pasado',
    sentenceBefore: 'An engine cooled by water is a',
    highlight: 'water-cooled',
    sentenceAfter: 'engine.',
    explanationEs:
      'Indica quién o qué ejecuta la acción pasiva sobre el sustantivo ("cooled by water" → "water-cooled").',
  },
  {
    id: 'pat-7',
    pattern: 'Adjective + Past Participle / Noun-ed',
    patternEs: 'Adjetivo + Participio / Rasgo con -ed',
    sentenceBefore: 'A man with a bad temper is a',
    highlight: 'bad-tempered',
    sentenceAfter: 'man.',
    explanationEs:
      'Clave para describir rasgos físicos y personalidad: short-haired, green-eyed, kind-hearted, open-minded.',
  },
  {
    id: 'pat-8',
    pattern: 'Adverb (-ly) + Past Participle',
    patternEs: 'Adverbio (-ly) + Participio Pasado',
    sentenceBefore: 'A city that has a dense population is a',
    highlight: 'densely populated',
    sentenceAfter: 'city.',
    explanationEs:
      'Cuando el adverbio termina en "-ly", en uso estándar suele escribirse sin guion ("brightly lit"), aunque también aparece unido en talleres.',
  },
];

export const WORKSHOP_SHEETS: Record<WorkshopSheetId, WorkshopSheet> = {
  pdf1: COMPOUND_PDF1_SHEET,
  pdf2: COMPOUND_PDF2_SHEET,
};

export function getAllExercisesInSheet(sheet: WorkshopSheet): WorkshopExercise[] {
  return sheet.sections.flatMap((s) => s.exercises);
}
