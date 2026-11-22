'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Play,
  Search,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import type { Language, Level, StudyMode, Topic, UserProgress } from '@/types/curriculum';
import { searchTopics } from '@/data/curriculum';
import { getRecommendedTopics } from '@/lib/adaptive-engine';
import { voiceEngine } from '@/lib/voice-engine';
import {
  FlashcardsModeIllustration,
  FrenchTrackIllustration,
  RepasoModeIllustration,
} from './EditorialIllustrations';

interface HeroExplorerProps {
  allTopics: Topic[];
  progress: UserProgress;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectTrack: (lang: Language, level?: Level) => void;
  onOpenTopic: (topic: Topic, mode: StudyMode) => void;
  onOpenSimulacro: () => void;
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
  onStartMistakesReview,
}: HeroExplorerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [greetingPlaying, setGreetingPlaying] = useState(false);

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

  const calcTrackPct = (lang: Language) => {
    const list = allTopics.filter((t) => t.language === lang && t.level === 'A1');
    if (list.length === 0) return 0;
    const sum = list.reduce(
      (acc, t) => acc + (progress.topicStats[t.slug]?.masteryPct ?? 0),
      0
    );
    return Math.round(sum / list.length);
  };

  const enA1Pct = calcTrackPct('en');
  const frA1Pct = calcTrackPct('fr');

  const handlePlayGreeting = () => {
    voiceEngine.speak({
      text: '¡Hola! Qué alegría verte por aquí. Soy la profe Valeria y hoy vamos a repasar inglés y francés paso a paso, a tu ritmo.',
      mode: 'es-CO',
      slow: progress.voiceSlow,
      muted: false,
      onStart: () => setGreetingPlaying(true),
      onEnd: () => setGreetingPlaying(false),
    });
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6 pb-8 sm:px-6 sm:pt-8">
      {/* Main Hero Card */}
      <div className="relative overflow-visible rounded-[32px] border border-[#ECE5D8] bg-white p-6 shadow-[0_14px_40px_-14px_rgba(30,41,59,0.08)] sm:p-8 lg:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/40 bg-[#FFFBEB] px-3 py-1 text-xs font-bold text-[#92400E]">
              <Sparkles className="h-3.5 w-3.5 text-[#D97706]" />
              <span>Prioridad Nivel 1 · Primeros Semestres</span>
            </div>

            <h1 className="font-display mt-4 text-3xl font-extrabold leading-[1.12] tracking-tight text-[#1E293B] sm:text-4xl lg:text-[42px]">
              Repasa{' '}
              <span className="text-[#D94646]">inglés</span> y{' '}
              <span className="text-[#2563EB]">francés</span> a tu ritmo, con
              guía de voz real.
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#475569] sm:text-base">
              Micro-guías visuales, práctica paso a paso con segunda oportunidad y
              simulacros con nota inmediata. Sin enredos.
            </p>

            {/* Smart Search Bar */}
            <div className="relative mt-6">
              <div className="flex items-center gap-2 rounded-2xl border-2 border-[#E6DEC8] bg-[#FAF7F2] px-4 py-3 transition focus-within:border-[#2563EB] focus-within:bg-white focus-within:shadow-md">
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
                  placeholder="Busca un tema: to be, être, preposiciones, verbos, primero..."
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
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
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
                        <p className="mt-0.5 truncate text-xs text-[#64748B]">
                          {topic.shortDescEs}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {progress.missedQuestionIds.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={onStartMistakesReview}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#F59E0B]/50 bg-[#FFFBEB] px-4 py-2 text-xs font-bold text-[#92400E] transition hover:bg-[#FEF3C7] active:translate-y-[1px]"
                >
                  <AlertCircle className="h-4 w-4 text-[#D97706]" />
                  <span>
                    Reforzar mis {progress.missedQuestionIds.length} dudas pendientes
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right Editorial Tutor Presence Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-[#ECE5D8] bg-[#FAF7F2] p-5">
              <div className="flex items-center gap-4">
                <img
                  src="/images/tutor-valeria.jpg"
                  alt="Profe Valeria, tutora de inglés y francés"
                  className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-md ring-2 ring-white sm:h-28 sm:w-28"
                />
                <div className="min-w-0">
                  <span className="inline-block rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold text-[#059669]">
                    Tutoría con voz
                  </span>
                  <h2 className="font-display mt-1.5 text-lg font-extrabold text-[#1E293B]">
                    Profe Valeria
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
                    Te acompaño en español, inglés y francés, señalándote pistas
                    cuando dudas.
                  </p>
                  <button
                    type="button"
                    onClick={handlePlayGreeting}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#D94646] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#C23939] active:translate-y-[1px]"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>{greetingPlaying ? 'Escuchando...' : 'Escuchar saludo'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Vibrant Language Track Cards */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelectTrack('en', 'A1')}
          className="group overflow-hidden rounded-3xl border border-[#ECE5D8] bg-white text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#D94646]/45 hover:shadow-md active:translate-y-0"
        >
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#FAF7F2]">
            <img
              src="/images/track-english.jpg"
              alt="Ruta de Inglés A1 a B1"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <span className="absolute left-4 top-4 rounded-full bg-[#D94646] px-3 py-1 text-xs font-bold text-white shadow-xs">
              Inglés · 16 temas
            </span>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-extrabold text-[#1E293B]">
                  Ruta de Inglés (A1 → B1)
                </h3>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  8 temas esenciales de Primero + refuerzo de English TECH
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#D94646] transition group-hover:bg-[#D94646] group-hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3.5">
              <div className="mb-1 flex justify-between text-[11px] font-bold text-[#64748B]">
                <span>Progreso Nivel 1 · Primero</span>
                <span className="text-[#D94646]">{enA1Pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F5EFE4]">
                <div
                  className="h-full rounded-full bg-[#D94646] transition-all duration-500"
                  style={{ width: `${Math.max(6, enA1Pct)}%` }}
                />
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTrack('fr', 'A1')}
          className="group overflow-hidden rounded-3xl border border-[#ECE5D8] bg-white text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#2563EB]/45 hover:shadow-md active:translate-y-0"
        >
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#FAF7F2]">
            <FrenchTrackIllustration className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
            <span className="absolute left-4 top-4 rounded-full bg-[#2563EB] px-3 py-1 text-xs font-bold text-white shadow-xs">
              Francés · 14 temas
            </span>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-extrabold text-[#1E293B]">
                  Ruta de Francés (A1 → B1)
                </h3>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  8 temas de Primero con pronunciación clara y género guiado
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB] transition group-hover:bg-[#2563EB] group-hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3.5">
              <div className="mb-1 flex justify-between text-[11px] font-bold text-[#64748B]">
                <span>Progreso Nivel 1 · Primero</span>
                <span className="text-[#2563EB]">{frA1Pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#F5EFE4]">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
                  style={{ width: `${Math.max(6, frA1Pct)}%` }}
                />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Three Tactile Study Modes */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onOpenTopic(recommended[0] ?? allTopics[0], 'repaso')}
          className="group flex items-center gap-4 rounded-3xl border border-[#ECE5D8] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#059669]/45 hover:shadow-md"
        >
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#FAF7F2]">
            <RepasoModeIllustration className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#059669]">
              Modo Repaso
            </span>
            <p className="font-display text-sm font-extrabold text-[#1E293B]">
              Práctica con Valeria
            </p>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Con pistas señaladas y voz
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenSimulacro}
          className="group flex items-center gap-4 rounded-3xl border border-[#ECE5D8] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#7C3AED]/45 hover:shadow-md"
        >
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#FAF7F2]">
            <img
              src="/images/mode-simulacro.jpg"
              alt="Modo Simulacro"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7C3AED]">
              Modo Simulacro
            </span>
            <p className="font-display text-sm font-extrabold text-[#1E293B]">
              Evaluación con Nota
            </p>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Calificación sobre 5.0
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenTopic(recommended[0] ?? allTopics[0], 'tarjetas')}
          className="group flex items-center gap-4 rounded-3xl border border-[#ECE5D8] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#F59E0B]/45 hover:shadow-md"
        >
          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-2xl bg-[#FAF7F2]">
            <FlashcardsModeIllustration className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D97706]">
              Tarjetas Rápidas
            </span>
            <p className="font-display text-sm font-extrabold text-[#1E293B]">
              Flashcards con Audio
            </p>
            <p className="mt-0.5 text-xs text-[#64748B]">
              Memoriza oído y escritura
            </p>
          </div>
        </button>
      </div>

      {/* Recommended for You Today */}
      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-extrabold text-[#1E293B] sm:text-lg">
            Recomendado para ti hoy
          </h2>
          <span className="text-xs font-semibold text-[#64748B]">
            Priorizando bases de Primero (A1)
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {recommended.map((topic) => {
            const mastery = progress.topicStats[topic.slug]?.masteryPct ?? 0;
            const isEn = topic.language === 'en';
            return (
              <div
                key={topic.slug}
                className="flex flex-col justify-between rounded-2xl border border-[#ECE5D8] bg-white p-4 transition hover:border-[#CBD5E1] hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isEn
                          ? 'bg-[#FEF2F2] text-[#D94646]'
                          : 'bg-[#EFF6FF] text-[#2563EB]'
                      }`}
                    >
                      {isEn ? 'Inglés' : 'Francés'} · {topic.level}
                    </span>
                    <span className="text-[11px] font-bold text-[#64748B]">
                      {mastery}% dominio
                    </span>
                  </div>
                  <h3 className="font-display mt-2.5 text-sm font-extrabold text-[#1E293B]">
                    {topic.titleEs}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-[#64748B]">
                    {topic.shortDescEs}
                  </p>
                </div>
                <div className="mt-3.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenTopic(topic, 'guide')}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#E6DEC8] bg-[#FAF7F2] px-2.5 py-2 text-xs font-bold text-[#334155] transition hover:bg-[#F2ECE0]"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Guía
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenTopic(topic, 'repaso')}
                    className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold text-white transition active:translate-y-[1px] ${
                      isEn
                        ? 'bg-[#D94646] hover:bg-[#C23939]'
                        : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                    }`}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Repasar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
