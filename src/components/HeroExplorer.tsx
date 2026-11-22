'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ClipboardCheck,
  MessageCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import type { Language, Level, StudyMode, Topic, UserProgress } from '@/types/curriculum';
import { searchTopics } from '@/data/curriculum';
import { getRecommendedTopics } from '@/lib/adaptive-engine';
import { FrenchTrackIllustration } from './EditorialIllustrations';
import { TopicVisual } from './TopicVisuals';

interface HeroExplorerProps {
  allTopics: Topic[];
  progress: UserProgress;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectTrack: (lang: Language, level?: Level) => void;
  onOpenTopic: (topic: Topic, mode: StudyMode) => void;
  onOpenSimulacro: () => void;
  onOpenTutoria: () => void;
  onStartMistakesReview: () => void;
}

export function HeroExplorer({
  allTopics,
  progress,
  searchQuery,
  onSearchChange,
  onSelectTrack,
  onOpenTopic,
  onOpenSimulacro,
  onOpenTutoria,
  onStartMistakesReview,
}: HeroExplorerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const quickResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchTopics(searchQuery).slice(0, 6);
  }, [searchQuery]);

  const recommended = useMemo(
    () => getRecommendedTopics(allTopics, progress),
    [allTopics, progress]
  );

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 pb-8 sm:px-6 sm:pt-8">
      {/* Airy Editorial Hero */}
      <div className="relative overflow-visible rounded-[32px] border border-[#ECE5D8] bg-white px-6 py-8 shadow-[0_14px_40px_-14px_rgba(30,41,59,0.08)] sm:px-10 sm:py-10">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/40 bg-[#FFFBEB] px-3 py-1 text-xs font-bold text-[#92400E]">
            <Sparkles className="h-3.5 w-3.5 text-[#D97706]" />
            <span>Nivel 1 · Primero en adelante</span>
          </div>

          <h1 className="font-display mt-4 text-3xl font-extrabold leading-[1.12] tracking-tight text-[#1E293B] sm:text-4xl lg:text-[44px]">
            Repasa{' '}
            <span className="text-[#D94646]">inglés</span> y{' '}
            <span className="text-[#2563EB]">francés</span> a tu ritmo
          </h1>

          <p className="mt-2.5 text-sm font-medium text-[#64748B] sm:text-base">
            Guías visuales, práctica guiada y simulacros con nota.
          </p>

          {/* Smart Search Bar */}
          <div className="relative mt-6 text-left">
            <div className="flex items-center gap-2.5 rounded-2xl border-2 border-[#E6DEC8] bg-[#FAF7F2] px-4 py-3.5 transition focus-within:border-[#2563EB] focus-within:bg-white focus-within:shadow-md">
              <Search className="h-5 w-5 shrink-0 text-[#64748B]" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 180)}
                placeholder="Busca un tema: to be, être, preposiciones, verbos..."
                aria-label="Buscar temas de inglés o francés"
                className="w-full bg-transparent text-sm font-medium text-[#1E293B] placeholder:text-[#94A3B8] focus:outline-none sm:text-base"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="rounded-full p-1 text-[#64748B] hover:bg-[#ECE5D8]"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="hidden rounded-lg border border-[#DCD3C0] bg-white px-2 py-0.5 text-[11px] font-bold text-[#64748B] sm:inline-block">
                  /
                </kbd>
              )}
            </div>

            {dropdownOpen && quickResults.length > 0 && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-[#ECE5D8] bg-white shadow-xl">
                {quickResults.map((topic) => (
                  <button
                    key={topic.slug}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDropdownOpen(false);
                      onOpenTopic(topic, 'guide');
                    }}
                    className="flex w-full items-center justify-between gap-3 border-b border-[#F5F0E6] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#FAF7F2]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          topic.language === 'en'
                            ? 'bg-[#FEF2F2] text-[#D94646]'
                            : 'bg-[#EFF6FF] text-[#2563EB]'
                        }`}
                      >
                        {topic.language === 'en' ? 'Inglés' : 'Francés'} · {topic.level}
                      </span>
                      <span className="truncate text-sm font-bold text-[#1E293B]">
                        {topic.titleEs}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenTutoria}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#D94646] px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#C23939] active:translate-y-[1px]"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Tutoría</span>
            </button>

            <button
              type="button"
              onClick={onOpenSimulacro}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#E6DEC8] bg-[#FAF7F2] px-5 py-3 text-sm font-bold text-[#1E293B] transition hover:border-[#7C3AED]/45 hover:bg-white active:translate-y-[1px]"
            >
              <ClipboardCheck className="h-4 w-4 text-[#7C3AED]" />
              <span>Simulacros</span>
            </button>

            {progress.missedQuestionIds.length > 0 && (
              <button
                type="button"
                onClick={onStartMistakesReview}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#F59E0B]/50 bg-[#FFFBEB] px-4 py-3 text-xs font-bold text-[#92400E] transition hover:bg-[#FEF3C7] active:translate-y-[1px]"
              >
                <AlertCircle className="h-4 w-4 text-[#D97706]" />
                <span>Repasar {progress.missedQuestionIds.length} dudas</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two Visual Language Track Cards */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelectTrack('en', 'A1')}
          className="group flex flex-col items-stretch overflow-hidden rounded-3xl border border-[#ECE5D8] bg-white text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#D94646]/45 hover:shadow-md active:translate-y-0"
        >
          <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#FAF7F2]">
            <img
              src="/images/track-english.jpg"
              alt="Ruta de Inglés A1 a B1"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <span className="absolute left-4 top-4 rounded-full bg-[#D94646] px-3 py-1 text-xs font-bold text-white shadow-xs">
              Inglés · 16 temas
            </span>
          </div>
          <div className="flex flex-1 items-center justify-between gap-3 p-5">
            <h2 className="font-display text-lg font-extrabold text-[#1E293B]">
              Inglés (A1 → B1)
            </h2>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#D94646] transition group-hover:bg-[#D94646] group-hover:text-white">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTrack('fr', 'A1')}
          className="group flex flex-col items-stretch overflow-hidden rounded-3xl border border-[#ECE5D8] bg-white text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#2563EB]/45 hover:shadow-md active:translate-y-0"
        >
          <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#FAF7F2]">
            <FrenchTrackIllustration className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
            <span className="absolute left-4 top-4 rounded-full bg-[#2563EB] px-3 py-1 text-xs font-bold text-white shadow-xs">
              Francés · 14 temas
            </span>
          </div>
          <div className="flex flex-1 items-center justify-between gap-3 p-5">
            <h2 className="font-display text-lg font-extrabold text-[#1E293B]">
              Francés (A1 → B1)
            </h2>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB] transition group-hover:bg-[#2563EB] group-hover:text-white">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </button>
      </div>

      {/* Visual-First Recommended Strip */}
      <div className="mt-8">
        <div className="mb-3.5 flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold text-[#1E293B] sm:text-lg">
            Recomendado para ti hoy
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {recommended.map((topic) => {
            const isEn = topic.language === 'en';
            return (
              <button
                key={topic.slug}
                type="button"
                onClick={() => onOpenTopic(topic, 'guide')}
                className="group flex flex-col items-stretch overflow-hidden rounded-3xl border border-[#ECE5D8] bg-white text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-md"
              >
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#FAF7F2]">
                  <TopicVisual
                    topic={topic}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-1 items-center justify-between gap-2.5 p-4">
                  <div className="min-w-0">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        isEn
                          ? 'bg-[#FEF2F2] text-[#D94646]'
                          : 'bg-[#EFF6FF] text-[#2563EB]'
                      }`}
                    >
                      {isEn ? 'Inglés' : 'Francés'} · {topic.level}
                    </span>
                    <h3 className="font-display mt-1.5 text-sm font-extrabold leading-snug text-[#1E293B]">
                      {topic.titleEs}
                    </h3>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8] transition group-hover:translate-x-0.5 group-hover:text-[#1E293B]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
