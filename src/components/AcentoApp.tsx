'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type {
  Language,
  Level,
  Question,
  SimulacroConfig,
  StudyMode,
  Topic,
  UserProgress,
} from '@/types/curriculum';
import {
  ALL_TOPICS,
  getNextTopic,
  getQuestionById,
  getTopicBySlug,
} from '@/data/curriculum';
import {
  createInitialProgress,
  evaluateBadges,
  loadProgress,
  recordQuestionOutcome,
  recordSessionComplete,
  saveProgress,
} from '@/lib/adaptive-engine';
import { parseDeepLinkParams } from '@/lib/deep-link';
import { voiceEngine } from '@/lib/voice-engine';
import { FlashcardDeck } from './FlashcardDeck';
import { HeroExplorer } from './HeroExplorer';
import { MicroGuideView } from './MicroGuideView';
import { ProgressModal } from './ProgressModal';
import { RepasoSession } from './RepasoSession';
import { SimulacroSession, type SimulacroItem } from './SimulacroSession';
import { SimulacroSetup } from './SimulacroSetup';
import { TopNav } from './TopNav';
import { TopicCatalog } from './TopicCatalog';

type ActiveView =
  | { kind: 'home' }
  | { kind: 'guide'; topic: Topic }
  | {
      kind: 'repaso';
      topic: Topic;
      customQuestions?: Question[];
      customTitle?: string;
    }
  | { kind: 'tarjetas'; topic: Topic }
  | { kind: 'simulacro-setup'; preselectedTopic?: Topic }
  | { kind: 'simulacro-run'; config: SimulacroConfig };

export function AcentoApp() {
  const searchParams = useSearchParams();
  const initialDeepLink = useMemo(
    () => parseDeepLinkParams(searchParams),
    [searchParams]
  );

  const [progress, setProgress] = useState<UserProgress>(createInitialProgress);
  const [hydrated, setHydrated] = useState(false);

  const [view, setView] = useState<ActiveView>(() => {
    if (initialDeepLink.topic) {
      const targetTopic = getTopicBySlug(initialDeepLink.topic);
      if (targetTopic) {
        const mode = initialDeepLink.mode ?? 'guide';
        if (mode === 'repaso') return { kind: 'repaso', topic: targetTopic };
        if (mode === 'tarjetas') return { kind: 'tarjetas', topic: targetTopic };
        if (mode === 'simulacro') {
          return { kind: 'simulacro-setup', preselectedTopic: targetTopic };
        }
        return { kind: 'guide', topic: targetTopic };
      }
    }
    if (initialDeepLink.mode === 'simulacro') {
      return { kind: 'simulacro-setup' };
    }
    return { kind: 'home' };
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<Language | 'all'>(
    () => initialDeepLink.lang ?? 'all'
  );
  const [levelFilter, setLevelFilter] = useState<Level | 'all'>(
    () => initialDeepLink.level ?? 'A1'
  );
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const fromEnglishTech = initialDeepLink.fromEnglishTech;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setProgress(loadProgress());
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveProgress(progress);
    }
  }, [progress, hydrated]);

  const openTopicWithMode = (topic: Topic, mode: StudyMode) => {
    voiceEngine.stop();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (mode === 'repaso') {
      setView({ kind: 'repaso', topic });
    } else if (mode === 'tarjetas') {
      setView({ kind: 'tarjetas', topic });
    } else if (mode === 'simulacro') {
      setView({ kind: 'simulacro-setup', preselectedTopic: topic });
    } else {
      setView({ kind: 'guide', topic });
    }
  };

  const handleSelectTrack = (lang: Language, level?: Level) => {
    setLanguageFilter(lang);
    setLevelFilter(level ?? 'A1');
    setSearchQuery('');
    const el = document.getElementById('catalogo-temas');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleToggleMute = () => {
    setProgress((prev) => {
      const nextMuted = !prev.voiceMuted;
      if (nextMuted) voiceEngine.stop();
      return { ...prev, voiceMuted: nextMuted };
    });
  };

  const handleToggleSlow = () => {
    setProgress((prev) => ({ ...prev, voiceSlow: !prev.voiceSlow }));
  };

  const handleToggleFavoriteTopic = (slug: string) => {
    setProgress((prev) => {
      const exists = prev.favorites.includes(slug);
      return {
        ...prev,
        favorites: exists
          ? prev.favorites.filter((s) => s !== slug)
          : [...prev.favorites, slug],
      };
    });
  };

  const handleStartMistakesReview = () => {
    const resolved = progress.missedQuestionIds
      .map((qId) => getQuestionById(qId))
      .filter((item): item is { topic: Topic; question: Question } => Boolean(item));

    if (resolved.length === 0) return;

    const anchorTopic = resolved[0].topic;
    setView({
      kind: 'repaso',
      topic: anchorTopic,
      customQuestions: resolved.slice(0, 10).map((r) => r.question),
      customTitle: `Repaso de tus ${Math.min(10, resolved.length)} dudas pendientes`,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReviewSimulacroMistakes = (missed: SimulacroItem[]) => {
    if (missed.length === 0) return;
    setView({
      kind: 'repaso',
      topic: missed[0].topic,
      customQuestions: missed.map((m) => m.question),
      customTitle: `Refuerzo de errores del simulacro (${missed.length})`,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextTopicForRepaso = useMemo(() => {
    if (view.kind !== 'repaso') return undefined;
    return getNextTopic(view.topic);
  }, [view]);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2]">
      <TopNav
        progress={progress}
        fromEnglishTech={fromEnglishTech}
        onGoHome={() => {
          voiceEngine.stop();
          setView({ kind: 'home' });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleMute={handleToggleMute}
        onToggleSlow={handleToggleSlow}
        onOpenProgress={() => setProgressModalOpen(true)}
      />

      <main className="flex-1">
        {view.kind === 'home' && (
          <>
            <HeroExplorer
              allTopics={ALL_TOPICS}
              progress={progress}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectTrack={handleSelectTrack}
              onOpenTopic={openTopicWithMode}
              onOpenSimulacro={() => {
                setView({ kind: 'simulacro-setup' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onStartMistakesReview={handleStartMistakesReview}
            />
            <TopicCatalog
              allTopics={ALL_TOPICS}
              progress={progress}
              searchQuery={searchQuery}
              languageFilter={languageFilter}
              levelFilter={levelFilter}
              favoritesOnly={favoritesOnly}
              onLanguageChange={setLanguageFilter}
              onLevelChange={setLevelFilter}
              onToggleFavoritesOnly={() => setFavoritesOnly((f) => !f)}
              onToggleFavoriteTopic={handleToggleFavoriteTopic}
              onOpenTopic={openTopicWithMode}
            />
          </>
        )}

        {view.kind === 'guide' && (
          <MicroGuideView
            topic={view.topic}
            progress={progress}
            onBack={() => setView({ kind: 'home' })}
            onSelectMode={(mode) => openTopicWithMode(view.topic, mode)}
            onToggleSlow={handleToggleSlow}
          />
        )}

        {view.kind === 'repaso' && (
          <RepasoSession
            key={`${view.topic.slug}-${view.customTitle ?? 'default'}`}
            topic={view.topic}
            initialQuestions={view.customQuestions}
            customTitle={view.customTitle}
            progress={progress}
            nextTopic={view.customQuestions ? undefined : nextTopicForRepaso}
            onBack={() =>
              setView(
                view.customQuestions
                  ? { kind: 'home' }
                  : { kind: 'guide', topic: view.topic }
              )
            }
            onToggleSlow={handleToggleSlow}
            onRecordAnswer={(topicSlug, questionId, isCorrect, xpEarned) =>
              setProgress((prev) =>
                recordQuestionOutcome(
                  prev,
                  topicSlug,
                  questionId,
                  isCorrect,
                  xpEarned,
                  ALL_TOPICS
                )
              )
            }
            onCompleteSession={(topicSlug, bonusXp) =>
              setProgress((prev) =>
                recordSessionComplete(prev, topicSlug, bonusXp, ALL_TOPICS)
              )
            }
            onOpenNextTopic={(next) => openTopicWithMode(next, 'guide')}
          />
        )}

        {view.kind === 'tarjetas' && (
          <FlashcardDeck
            topic={view.topic}
            progress={progress}
            onBack={() => setView({ kind: 'guide', topic: view.topic })}
            onToggleSlow={handleToggleSlow}
            onMarkMastered={(cardId) =>
              setProgress((prev) => {
                if (prev.masteredFlashcardIds.includes(cardId)) return prev;
                const next: UserProgress = {
                  ...prev,
                  xp: prev.xp + 5,
                  masteredFlashcardIds: [...prev.masteredFlashcardIds, cardId],
                };
                return evaluateBadges(next, ALL_TOPICS);
              })
            }
            onStartRepaso={() => openTopicWithMode(view.topic, 'repaso')}
          />
        )}

        {view.kind === 'simulacro-setup' && (
          <SimulacroSetup
            allTopics={ALL_TOPICS}
            preselectedTopic={view.preselectedTopic}
            onBack={() => setView({ kind: 'home' })}
            onStartSimulacro={(config) => {
              setView({ kind: 'simulacro-run', config });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {view.kind === 'simulacro-run' && (
          <SimulacroSession
            config={view.config}
            allTopics={ALL_TOPICS}
            progress={progress}
            onBack={() => setView({ kind: 'home' })}
            onFinishRecord={(records, xpEarned) => {
              setProgress((prev) => {
                let next: UserProgress = {
                  ...prev,
                  simulacrosCompleted: prev.simulacrosCompleted + 1,
                };
                for (const rec of records) {
                  next = recordQuestionOutcome(
                    next,
                    rec.topicSlug,
                    rec.questionId,
                    rec.isCorrect,
                    0,
                    ALL_TOPICS
                  );
                }
                next = { ...next, xp: next.xp + xpEarned };
                return evaluateBadges(next, ALL_TOPICS);
              });
            }}
            onReviewMistakes={handleReviewSimulacroMistakes}
          />
        )}
      </main>

      <footer className="border-t border-[#ECE5D8] bg-white/75 py-6 text-center text-xs text-[#64748B]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6">
          <p>
            <strong className="text-[#1E293B]">Acento</strong> · Repasos y
            simulacros de Inglés y Francés
          </p>
          <p>
            Complemento interactivo conectado con{' '}
            <a
              href="https://englishtech.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#D94646] hover:underline"
            >
              English TECH
            </a>
          </p>
        </div>
      </footer>

      <ProgressModal
        isOpen={progressModalOpen}
        progress={progress}
        allTopics={ALL_TOPICS}
        onClose={() => setProgressModalOpen(false)}
        onResetProgress={() => setProgress(createInitialProgress())}
      />
    </div>
  );
}
