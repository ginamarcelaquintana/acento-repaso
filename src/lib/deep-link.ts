import type { Language, Level, StudyMode } from '@/types/curriculum';

export interface ParsedDeepLink {
  lang?: Language;
  level?: Level;
  topic?: string;
  mode?: StudyMode;
  sheet?: 'pdf1' | 'pdf2';
  fromEnglishTech: boolean;
}

export function parseDeepLinkParams(searchParams: URLSearchParams): ParsedDeepLink {
  const rawLang = searchParams.get('lang');
  const rawLevel = searchParams.get('level')?.toUpperCase();
  const rawTopic = searchParams.get('topic') ?? undefined;
  const rawMode = searchParams.get('mode');
  const rawSheet = searchParams.get('sheet');
  const fromParam = searchParams.get('from');

  const lang: Language | undefined =
    rawLang === 'en' || rawLang === 'fr' ? rawLang : undefined;

  const level: Level | undefined =
    rawLevel === 'A1' || rawLevel === 'A2' || rawLevel === 'B1'
      ? rawLevel
      : undefined;

  let mode: StudyMode | undefined =
    rawMode === 'guide' ||
    rawMode === 'repaso' ||
    rawMode === 'simulacro' ||
    rawMode === 'tarjetas' ||
    rawMode === 'taller' ||
    rawMode === 'hora'
      ? rawMode
      : undefined;

  if (rawSheet === 'hora' || rawSheet === 'telling-time') {
    mode = 'hora';
  }

  const sheet: 'pdf1' | 'pdf2' | undefined =
    rawSheet === 'pdf2' || rawSheet === 'compound-adjectives-2'
      ? 'pdf2'
      : rawSheet === 'pdf1' || rawSheet === 'compound-adjectives-1'
        ? 'pdf1'
        : undefined;

  return {
    lang,
    level,
    topic: rawTopic,
    mode,
    sheet,
    fromEnglishTech: fromParam === 'englishtech',
  };
}

export function buildTopicLink(
  topicSlug: string,
  mode: StudyMode = 'guide',
  fromEnglishTech = true
): string {
  const params = new URLSearchParams();
  params.set('topic', topicSlug);
  params.set('mode', mode);
  if (fromEnglishTech) {
    params.set('from', 'englishtech');
  }
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?${params.toString()}`;
}

export function buildTallerLink(
  sheet: 'pdf1' | 'pdf2' = 'pdf1',
  fromEnglishTech = true
): string {
  const params = new URLSearchParams();
  params.set('mode', 'taller');
  params.set('sheet', sheet);
  if (fromEnglishTech) {
    params.set('from', 'englishtech');
  }
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?${params.toString()}`;
}

export function buildTimeWorkshopLink(fromEnglishTech = true): string {
  const params = new URLSearchParams();
  params.set('mode', 'hora');
  if (fromEnglishTech) {
    params.set('from', 'englishtech');
  }
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?${params.toString()}`;
}
