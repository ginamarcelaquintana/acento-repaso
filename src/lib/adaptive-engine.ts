import type { BadgeDefinition, Topic, UserProgress } from '@/types/curriculum';

const STORAGE_KEY = 'acento_progress_v1';

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-step',
    titleEs: 'Primer Paso',
    descEs: 'Completaste tu primera sesión de repaso guiado.',
    tone: 'coral',
  },
  {
    id: 'a1-explorer',
    titleEs: 'Explorador de Primero',
    descEs: 'Dominaste al menos 3 temas del Nivel 1 (A1).',
    tone: 'amber',
  },
  {
    id: 'bilingual-spark',
    titleEs: 'Chispa Bilingüe',
    descEs: 'Practicaste temas de inglés y de francés.',
    tone: 'cobalt',
  },
  {
    id: 'simulacro-pro',
    titleEs: 'Mente de Simulacro',
    descEs: 'Terminaste tu primer simulacro completo.',
    tone: 'plum',
  },
  {
    id: 'streak-3',
    titleEs: 'Constancia de 3 Días',
    descEs: 'Mantuviste tu racha activa por 3 días.',
    tone: 'emerald',
  },
  {
    id: 'xp-250',
    titleEs: '250 Puntos Acento',
    descEs: 'Acumulaste 250 XP practicando con Valeria.',
    tone: 'amber',
  },
  {
    id: 'flash-master',
    titleEs: 'Memoria Ágil',
    descEs: 'Dominaste 15 tarjetas de repaso con audio.',
    tone: 'emerald',
  },
  {
    id: 'perfectionist',
    titleEs: 'Sin Errores Pendientes',
    descEs: 'Limpiaste tu bandeja de errores pendientes.',
    tone: 'coral',
  },
];

export function createInitialProgress(): UserProgress {
  return {
    xp: 0,
    streakDays: 1,
    lastStudyDate: null,
    topicStats: {},
    missedQuestionIds: [],
    masteredFlashcardIds: [],
    favorites: [],
    unlockedBadges: [],
    simulacrosCompleted: 0,
    voiceMuted: false,
    voiceSlow: false,
  };
}

export function loadProgress(): UserProgress {
  if (typeof window === 'undefined') return createInitialProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialProgress();
    const parsed = JSON.parse(raw) as Partial<UserProgress>;
    return {
      ...createInitialProgress(),
      ...parsed,
      topicStats: parsed.topicStats ?? {},
      missedQuestionIds: Array.isArray(parsed.missedQuestionIds)
        ? parsed.missedQuestionIds
        : [],
      masteredFlashcardIds: Array.isArray(parsed.masteredFlashcardIds)
        ? parsed.masteredFlashcardIds
        : [],
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      unlockedBadges: Array.isArray(parsed.unlockedBadges)
        ? parsed.unlockedBadges
        : [],
    };
  } catch {
    return createInitialProgress();
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function updateStreak(progress: UserProgress): UserProgress {
  const today = getTodayIso();
  if (!progress.lastStudyDate) {
    return { ...progress, lastStudyDate: today, streakDays: 1 };
  }
  if (progress.lastStudyDate === today) {
    return progress;
  }

  const prev = new Date(`${progress.lastStudyDate}T00:00:00Z`).getTime();
  const curr = new Date(`${today}T00:00:00Z`).getTime();
  const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

  return {
    ...progress,
    lastStudyDate: today,
    streakDays: diffDays === 1 ? progress.streakDays + 1 : 1,
  };
}

export function evaluateBadges(
  progress: UserProgress,
  allTopics: Topic[]
): UserProgress {
  const unlocked = new Set(progress.unlockedBadges);

  const completedSessionsCount = Object.values(progress.topicStats).reduce(
    (sum, st) => sum + st.completedSessions,
    0
  );
  if (completedSessionsCount >= 1) unlocked.add('first-step');

  const masteredA1Count = allTopics.filter(
    (t) => t.level === 'A1' && (progress.topicStats[t.slug]?.masteryPct ?? 0) >= 75
  ).length;
  if (masteredA1Count >= 3) unlocked.add('a1-explorer');

  const practicedEn = allTopics.some(
    (t) => t.language === 'en' && (progress.topicStats[t.slug]?.attempts ?? 0) > 0
  );
  const practicedFr = allTopics.some(
    (t) => t.language === 'fr' && (progress.topicStats[t.slug]?.attempts ?? 0) > 0
  );
  if (practicedEn && practicedFr) unlocked.add('bilingual-spark');

  if (progress.simulacrosCompleted >= 1) unlocked.add('simulacro-pro');
  if (progress.streakDays >= 3) unlocked.add('streak-3');
  if (progress.xp >= 250) unlocked.add('xp-250');
  if (progress.masteredFlashcardIds.length >= 15) unlocked.add('flash-master');
  if (completedSessionsCount >= 2 && progress.missedQuestionIds.length === 0) {
    unlocked.add('perfectionist');
  }

  return { ...progress, unlockedBadges: Array.from(unlocked) };
}

export function recordQuestionOutcome(
  current: UserProgress,
  topicSlug: string,
  questionId: string,
  isCorrect: boolean,
  xpEarned: number,
  allTopics: Topic[]
): UserProgress {
  const updated = updateStreak(current);
  const prevStat = updated.topicStats[topicSlug] ?? {
    attempts: 0,
    correct: 0,
    masteryPct: 0,
    completedSessions: 0,
  };

  const attempts = prevStat.attempts + 1;
  const correct = prevStat.correct + (isCorrect ? 1 : 0);
  const masteryPct = Math.min(100, Math.round((correct / attempts) * 100));

  const missedSet = new Set(updated.missedQuestionIds);
  if (isCorrect) {
    missedSet.delete(questionId);
  } else {
    missedSet.add(questionId);
  }

  const next: UserProgress = {
    ...updated,
    xp: updated.xp + xpEarned,
    topicStats: {
      ...updated.topicStats,
      [topicSlug]: {
        ...prevStat,
        attempts,
        correct,
        masteryPct,
        lastReviewedAt: new Date().toISOString(),
      },
    },
    missedQuestionIds: Array.from(missedSet),
  };

  return evaluateBadges(next, allTopics);
}

export function recordSessionComplete(
  current: UserProgress,
  topicSlug: string,
  bonusXp: number,
  allTopics: Topic[]
): UserProgress {
  const updated = updateStreak(current);
  const prevStat = updated.topicStats[topicSlug] ?? {
    attempts: 0,
    correct: 0,
    masteryPct: 0,
    completedSessions: 0,
  };

  const next: UserProgress = {
    ...updated,
    xp: updated.xp + bonusXp,
    topicStats: {
      ...updated.topicStats,
      [topicSlug]: {
        ...prevStat,
        completedSessions: prevStat.completedSessions + 1,
        lastReviewedAt: new Date().toISOString(),
      },
    },
  };

  return evaluateBadges(next, allTopics);
}

export function getRecommendedTopics(
  allTopics: Topic[],
  progress: UserProgress
): Topic[] {
  const scored = allTopics.map((topic) => {
    const stat = progress.topicStats[topic.slug];
    const mastery = stat?.masteryPct ?? 0;
    const hasMissed = topic.questions.some((q) =>
      progress.missedQuestionIds.includes(q.id)
    );

    let priority = 0;
    if (hasMissed) priority += 40;
    if (topic.priorityFirst) priority += 25;
    if (topic.level === 'A1') priority += 15;
    if (!stat || stat.attempts === 0) priority += 10;
    if (mastery < 80) priority += 100 - mastery;
    else priority -= 20;

    return { topic, priority };
  });

  scored.sort((a, b) => b.priority - a.priority || a.topic.order - b.topic.order);

  // Ensure a balanced mix if nothing started yet: top English A1 + top French A1 + next priority
  const top = scored.slice(0, 3).map((s) => s.topic);
  const hasEn = top.some((t) => t.language === 'en');
  const hasFr = top.some((t) => t.language === 'fr');

  if (!hasFr) {
    const firstFr = scored.find((s) => s.topic.language === 'fr')?.topic;
    if (firstFr) top[top.length - 1] = firstFr;
  } else if (!hasEn) {
    const firstEn = scored.find((s) => s.topic.language === 'en')?.topic;
    if (firstEn) top[top.length - 1] = firstEn;
  }

  return top;
}
