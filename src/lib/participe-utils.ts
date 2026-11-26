import type { ParticipeExercise } from '@/types/participe-workshop';

export const FRENCH_ACCENT_KEYS = ['é', 'û', 'ç', 'è', 'ê'] as const;

export function normalizeFrenchInput(raw: string): string {
  return raw
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
    .trim();
}

export function stripFrenchAccents(raw: string): string {
  return normalizeFrenchInput(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC');
}

export function matchesFrenchParticiple(
  rawInput: string,
  acceptedAnswers: string[],
  isChoiceSelection = false
): boolean {
  if (isChoiceSelection) {
    const cleanChoice = rawInput.trim().toLowerCase();
    return acceptedAnswers.some(
      (candidate) => candidate.trim().toLowerCase() === cleanChoice
    );
  }

  const cleanInput = normalizeFrenchInput(rawInput);
  if (!cleanInput) {
    return false;
  }

  return acceptedAnswers.some(
    (candidate) => normalizeFrenchInput(candidate) === cleanInput
  );
}

export function diagnoseFrenchParticipleMistake(
  rawInput: string,
  exercise: ParticipeExercise
): string {
  const norm = normalizeFrenchInput(rawInput);
  const correct = normalizeFrenchInput(exercise.correctAnswer);

  if (!norm) {
    return 'Escribe o selecciona una respuesta en francés antes de comprobar.';
  }

  if (exercise.options && exercise.options.length > 0) {
    return `Fíjate en la familia del verbo "${exercise.infinitive}" (${exercise.translationEs}). ${exercise.progressiveHints[0]}`;
  }

  // Detect wrong Spanish acute accent í on -ir / -i verbs (never used in French participles)
  if (norm.includes('í') && !correct.includes('í')) {
    return '¡Atención! En francés los participios en -i NO llevan tilde (por ejemplo: fini, sorti, ri — nunca con "í").';
  }

  // Detect missing French accent or cedilla when base letters match
  if (stripFrenchAccents(norm) === stripFrenchAccents(correct)) {
    if (correct === 'dû' && norm === 'du') {
      return '¡Casi! Te faltó el acento circunflejo: se escribe "dû" (con û) para distinguirlo de "du". Usa el botón rápido û.';
    }
    if (correct.includes('ç') && !norm.includes('ç')) {
      return '¡Muy cerca! Antes de "u", en recevoir y décevoir la c necesita cedilla (ç → reçu, déçu). Usa el botón rápido ç.';
    }
    if (correct.endsWith('é') && norm.endsWith('e')) {
      return '¡Ojo con la regla del 1.º grupo! Sin la tilde aguda (é), el participio queda mal formado. Usa el botón rápido é.';
    }
    return '¡Casi perfecto! Revisa únicamente las tildes o la cedilla usando los botones rápidos de abajo.';
  }

  // Detect student typing the unconjugated infinitive
  const cleanInfinitive = normalizeFrenchInput(exercise.infinitive).replace(
    /^se\s+|^s'/,
    ''
  );
  if (norm === normalizeFrenchInput(exercise.infinitive) || norm === cleanInfinitive) {
    return `Escribiste el infinitivo (${exercise.infinitive}). Transforma la terminación para formar el participe passé.`;
  }

  // Detect repeating auxiliary inside a sentence blank
  if (/^(j'ai|ai|as|a|avons|avez|ont|suis|es|est)\s+/.test(norm)) {
    return 'La frase ya tiene el auxiliar escrito; en el espacio solo va el participe passé.';
  }

  // Detect -is vs -it silent consonant confusion
  if (
    (correct.endsWith('is') && norm.endsWith('it')) ||
    (correct.endsWith('it') && norm.endsWith('is'))
  ) {
    return '¡Ojo con la letra muda final! Verifica si este verbo pertenece a la familia -is (pris, mis) o a la familia -it (dit, écrit, fait).';
  }

  // Detect missing -s or -t on -is / -it / -ert / -nt stems
  if (
    (correct.endsWith('ert') && norm.endsWith('er')) ||
    (correct.endsWith('nt') && norm.endsWith('n'))
  ) {
    return '¡Te falta la consonante final del participio! Recuerda que los participios de esa familia terminan en "t" (ej. ouvert, peint).';
  }

  return `Revisa el infinitivo "${exercise.infinitive}" (${exercise.translationEs}) y su familia de terminación. ${exercise.progressiveHints[0]}`;
}
