import type { Language, Level, StudyMode } from '@/types/curriculum';

export interface ParsedDeepLink {
  lang?: Language;
  level?: Level;
  topic?: string;
  mode?: StudyMode;
  fromEnglishTech: boolean;
}

export function parseDeepLinkParams(searchParams: URLSearchParams): ParsedDeepLink {
  const rawLang = searchParams.get('lang');
  const rawLevel = searchParams.get('level')?.toUpperCase();
  const rawTopic = searchParams.get('topic') ?? undefined;
  const rawMode = searchParams.get('mode');
  const fromParam = searchParams.get('from');

  const lang: Language | undefined =
    rawLang === 'en' || rawLang === 'fr' ? rawLang : undefined;

  const level: Level | undefined =
    rawLevel === 'A1' || rawLevel === 'A2' || rawLevel === 'B1'
      ? rawLevel
      : undefined;

  const mode: StudyMode | undefined =
    rawMode === 'guide' ||
    rawMode === 'repaso' ||
    rawMode === 'simulacro' ||
    rawMode === 'tarjetas'
      ? rawMode
      : undefined;

  return {
    lang,
    level,
    topic: rawTopic,
    mode,
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
