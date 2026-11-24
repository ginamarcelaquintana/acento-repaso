const HOUR_WORDS: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
};

const TENS_WORDS: Record<number, string> = {
  20: 'twenty',
  30: 'thirty',
  40: 'forty',
  50: 'fifty',
};

const TEENS_AND_SMALL: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
  13: 'thirteen',
  14: 'fourteen',
  15: 'fifteen',
  16: 'sixteen',
  17: 'seventeen',
  18: 'eighteen',
  19: 'nineteen',
};

export function numberToEnglishWord(n: number): string {
  const safe = Math.max(0, Math.min(59, Math.floor(n)));
  if (safe === 0) return 'zero';
  if (safe < 20) return TEENS_AND_SMALL[safe] ?? String(safe);
  const tens = Math.floor(safe / 10) * 10;
  const ones = safe % 10;
  const tensWord = TENS_WORDS[tens] ?? '';
  if (ones === 0) return tensWord;
  return `${tensWord}-${TEENS_AND_SMALL[ones]}`;
}

export function normalizeClockHour(hours: number): number {
  const h = Math.round(hours) % 12;
  return h <= 0 ? h + 12 : h;
}

export function nextClockHour(hours: number): number {
  return normalizeClockHour(normalizeClockHour(hours) + 1);
}

export function formatDigital(hours: number, minutes: number): string {
  const h = normalizeClockHour(hours);
  const m = ((Math.round(minutes) % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeToTraditionalEnglish(hours: number, minutes: number): string {
  const h = normalizeClockHour(hours);
  const m = ((Math.round(minutes) % 60) + 60) % 60;
  const hWord = HOUR_WORDS[h];
  const nextWord = HOUR_WORDS[nextClockHour(h)];

  if (m === 0) return `It's ${hWord} o'clock.`;
  if (m === 15) return `It's a quarter past ${hWord}.`;
  if (m === 30) return `It's half past ${hWord}.`;
  if (m === 45) return `It's a quarter to ${nextWord}.`;
  if (m < 30) return `It's ${numberToEnglishWord(m)} past ${hWord}.`;
  return `It's ${numberToEnglishWord(60 - m)} to ${nextWord}.`;
}

export function timeToDigitalEnglish(hours: number, minutes: number): string {
  const h = normalizeClockHour(hours);
  const m = ((Math.round(minutes) % 60) + 60) % 60;
  const hWord = HOUR_WORDS[h];
  if (m === 0) return `It's ${hWord} o'clock.`;
  if (m < 10) return `It's ${hWord} oh-${numberToEnglishWord(m)}.`;
  return `It's ${hWord} ${numberToEnglishWord(m)}.`;
}

export function normalizeTimeText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\bit is\b/g, "it's")
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/[.,!?;:]+$/g, '')
    .trim();
}

function stripOptionalPrefixAndArticle(normalized: string): string {
  return normalized
    .replace(/^it's\s+/, '')
    .replace(/^its\s+/, '')
    .replace(/^at\s+/, '')
    .trim();
}

export function matchesAcceptedTimePhrase(
  userInput: string,
  accepted: string[],
  targetHours: number,
  targetMinutes: number,
  allowDigitalStyle: boolean
): boolean {
  const normUser = normalizeTimeText(userInput);
  if (!normUser) return false;
  const strippedUser = stripOptionalPrefixAndArticle(normUser);

  const candidates = new Set<string>();
  const addVariants = (phrase: string) => {
    const n = normalizeTimeText(phrase);
    candidates.add(n);
    const s = stripOptionalPrefixAndArticle(n);
    candidates.add(s);
    // Allow optional "a " before quarter
    candidates.add(n.replace(/\ba quarter\b/g, 'quarter'));
    candidates.add(s.replace(/\ba quarter\b/g, 'quarter'));
    // Allow "its" without apostrophe cleanly
    candidates.add(n.replace("it's ", 'its '));
    // Allow "o clock" / "oclock"
    candidates.add(n.replace("o'clock", 'oclock'));
    candidates.add(s.replace("o'clock", 'oclock'));
    candidates.add(n.replace("o'clock", 'o clock'));
    candidates.add(s.replace("o'clock", 'o clock'));
  };

  for (const a of accepted) addVariants(a);
  addVariants(timeToTraditionalEnglish(targetHours, targetMinutes));
  if (allowDigitalStyle) {
    addVariants(timeToDigitalEnglish(targetHours, targetMinutes));
  }

  const userNormalizedVariants = [
    normUser,
    strippedUser,
    normUser.replace(/\ba quarter\b/g, 'quarter'),
    strippedUser.replace(/\ba quarter\b/g, 'quarter'),
  ];

  return userNormalizedVariants.some((v) => candidates.has(v));
}

export function diagnoseTimeWritingMistake(
  userInput: string,
  targetHours: number,
  targetMinutes: number,
  requirePastTo: boolean
): string | null {
  const raw = userInput.trim();
  if (!raw) {
    return 'Escribe primero la hora en palabras en inglés (por ejemplo comenzando por "It\'s...") y luego comprueba.';
  }

  if (/\d/.test(raw)) {
    return 'Escribe los números en letra (por ejemplo "three", "ten", "fifteen" o "quarter"), sin usar dígitos.';
  }

  const norm = normalizeTimeText(raw);
  const h = normalizeClockHour(targetHours);
  const m = ((targetMinutes % 60) + 60) % 60;
  const hWord = HOUR_WORDS[h];
  const nextWord = HOUR_WORDS[nextClockHour(h)];

  if (m === 30 && /\bhalf\s+to\b/.test(norm)) {
    return '¡Ojo! En inglés la media hora (:30) SIEMPRE se dice "half past ..." mirando la hora que acaba de pasar, nunca "half to".';
  }

  if (m === 30 && requirePastTo && norm.includes('thirty') && !norm.includes('half')) {
    return '¡Bien leída la hora digital! Para practicar el formato tradicional, reemplaza "thirty" por "half past ...".';
  }

  if (m === 0 && !norm.includes('clock')) {
    return `Para una hora en punto, acompaña al número (${hWord}) con la expresión "o'clock".`;
  }

  if (m > 30) {
    // Classic A1 mistake: using current hour with "to" (e.g. "quarter to eight" when clock shows 8:45)
    if (norm.includes(' to ') && norm.includes(hWord) && !norm.includes(nextWord)) {
      return `¡Casi! Con "to" miramos hacia la SIGUIENTE hora a la que vamos a llegar (${nextWord}), no hacia la hora actual (${hWord}).`;
    }
    if (norm.includes(' past ')) {
      return 'Cuando el minutero pasa de la media hora (lado izquierdo del reloj), en formato tradicional usamos "to" calculando cuánto falta para la siguiente hora.';
    }
    if (requirePastTo && norm.includes(hWord) && !norm.includes(' to ')) {
      return 'Este punto te pide practicar la estructura con "past" o "to". ¿Cuántos minutos faltan para la siguiente hora?';
    }
  }

  if (m > 0 && m < 30) {
    if (norm.includes(' to ')) {
      return 'El minutero está en la primera mitad derecha del reloj (entre :01 y :30), así que usamos "past" (minutos que ya pasaron).';
    }
    if (m === 15 && norm.includes('fifteen') && requirePastTo) {
      return '¡Buen sentido! Para practicar la forma tradicional, reemplaza "fifteen" por "a quarter past ...".';
    }
  }

  return null;
}
