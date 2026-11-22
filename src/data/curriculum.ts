import type { Language, Level, Question, Topic } from '@/types/curriculum';
import { ENGLISH_A1_TOPICS } from './english-a1';
import { ENGLISH_A2_B1_TOPICS } from './english-a2-b1';
import { FRENCH_A1_TOPICS } from './french-a1';
import { FRENCH_A2_B1_TOPICS } from './french-a2-b1';

export const ALL_TOPICS: Topic[] = [
  ...ENGLISH_A1_TOPICS,
  ...FRENCH_A1_TOPICS,
  ...ENGLISH_A2_B1_TOPICS,
  ...FRENCH_A2_B1_TOPICS,
];

const QUESTION_MAP = new Map<string, { topic: Topic; question: Question }>();
for (const topic of ALL_TOPICS) {
  for (const question of topic.questions) {
    QUESTION_MAP.set(question.id, { topic, question });
  }
}

export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function getTopicBySlug(slug: string | null | undefined): Topic | undefined {
  if (!slug) return undefined;
  return ALL_TOPICS.find((t) => t.slug === slug || t.id === slug);
}

export function getQuestionById(
  questionId: string
): { topic: Topic; question: Question } | undefined {
  return QUESTION_MAP.get(questionId);
}

export function getTopicsByLanguageAndLevel(
  language?: Language | 'all',
  level?: Level | 'all'
): Topic[] {
  return ALL_TOPICS.filter((topic) => {
    if (language && language !== 'all' && topic.language !== language) return false;
    if (level && level !== 'all' && topic.level !== level) return false;
    return true;
  }).sort((a, b) => {
    if (a.priorityFirst !== b.priorityFirst) return a.priorityFirst ? -1 : 1;
    const levelWeight = { A1: 1, A2: 2, B1: 3 };
    if (levelWeight[a.level] !== levelWeight[b.level]) {
      return levelWeight[a.level] - levelWeight[b.level];
    }
    return a.order - b.order;
  });
}

export interface SearchFilters {
  language?: Language | 'all';
  level?: Level | 'all';
  favoritesOnly?: boolean;
  favoriteSlugs?: string[];
}

export function searchTopics(rawQuery: string, filters: SearchFilters = {}): Topic[] {
  const query = normalizeSearchText(rawQuery);

  const aliasTokens = query
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (token === 'primero' || token === 'basico' || token === 'principiante' || token === 'inicial') {
        return 'a1';
      }
      if (token === 'intermedio') return 'b1';
      if (token === 'ingles') return 'en';
      if (token === 'frances') return 'fr';
      return token;
    });

  const baseList = ALL_TOPICS.filter((topic) => {
    if (filters.language && filters.language !== 'all' && topic.language !== filters.language) {
      return false;
    }
    if (filters.level && filters.level !== 'all' && topic.level !== filters.level) {
      return false;
    }
    if (filters.favoritesOnly && !(filters.favoriteSlugs ?? []).includes(topic.slug)) {
      return false;
    }
    return true;
  });

  if (aliasTokens.length === 0) {
    return baseList.sort((a, b) => {
      if (a.priorityFirst !== b.priorityFirst) return a.priorityFirst ? -1 : 1;
      const levelWeight = { A1: 1, A2: 2, B1: 3 };
      if (levelWeight[a.level] !== levelWeight[b.level]) {
        return levelWeight[a.level] - levelWeight[b.level];
      }
      return a.order - b.order;
    });
  }

  const scored = baseList
    .map((topic) => {
      const titleNorm = normalizeSearchText(topic.titleEs);
      const targetNorm = normalizeSearchText(topic.titleTarget);
      const descNorm = normalizeSearchText(topic.shortDescEs);
      const catNorm = normalizeSearchText(topic.category);
      const kwNorm = topic.keywords.map(normalizeSearchText).join(' ');
      const guideNorm = topic.microGuide
        .map((g) => normalizeSearchText(`${g.title} ${g.formula ?? ''} ${g.tip}`))
        .join(' ');
      const levelNorm = topic.level.toLowerCase();
      const langNorm = topic.language;

      const haystack = `${titleNorm} ${targetNorm} ${descNorm} ${catNorm} ${kwNorm} ${guideNorm} ${levelNorm} ${langNorm}`;

      let score = 0;
      for (const token of aliasTokens) {
        if (!haystack.includes(token)) {
          return { topic, score: -1 };
        }
        if (titleNorm.includes(token)) score += 10;
        if (targetNorm.includes(token)) score += 8;
        if (kwNorm.includes(token)) score += 6;
        if (levelNorm === token || langNorm === token) score += 5;
        if (descNorm.includes(token)) score += 3;
        if (guideNorm.includes(token)) score += 2;
      }

      if (topic.priorityFirst) score += 2;
      return { topic, score };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.topic.order - b.topic.order);

  return scored.map((item) => item.topic);
}

export function getNextTopic(currentTopic: Topic): Topic | undefined {
  const sameLang = ALL_TOPICS.filter((t) => t.language === currentTopic.language).sort(
    (a, b) => {
      const levelWeight = { A1: 1, A2: 2, B1: 3 };
      if (levelWeight[a.level] !== levelWeight[b.level]) {
        return levelWeight[a.level] - levelWeight[b.level];
      }
      return a.order - b.order;
    }
  );
  const idx = sameLang.findIndex((t) => t.slug === currentTopic.slug);
  if (idx >= 0 && idx + 1 < sameLang.length) {
    return sameLang[idx + 1];
  }
  return undefined;
}
