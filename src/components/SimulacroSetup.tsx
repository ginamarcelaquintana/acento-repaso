'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardCheck, Clock, Play } from 'lucide-react';
import type { SimulacroConfig, Topic } from '@/types/curriculum';

interface SimulacroSetupProps {
  allTopics: Topic[];
  preselectedTopic?: Topic;
  onBack: () => void;
  onStartSimulacro: (config: SimulacroConfig) => void;
}

export function SimulacroSetup({
  allTopics,
  preselectedTopic,
  onBack,
  onStartSimulacro,
}: SimulacroSetupProps) {
  const [language, setLanguage] = useState<SimulacroConfig['language']>(
    preselectedTopic ? preselectedTopic.language : 'en'
  );
  const [level, setLevel] = useState<SimulacroConfig['level']>(
    preselectedTopic ? preselectedTopic.level : 'A1'
  );
  const [topicSlug, setTopicSlug] = useState<string>(
    preselectedTopic ? preselectedTopic.slug : ''
  );
  const [questionCount, setQuestionCount] = useState<10 | 15 | 20>(10);
  const [timerMinutes, setTimerMinutes] = useState<0 | 5 | 10 | 15>(10);

  const matchingTopics = useMemo(() => {
    return allTopics.filter((t) => {
      if (language !== 'both' && t.language !== language) return false;
      if (level !== 'all' && t.level !== level) return false;
      return true;
    });
  }, [allTopics, language, level]);

  const handleStart = () => {
    onStartSimulacro({
      language,
      level,
      topicSlug: topicSlug || undefined,
      questionCount,
      timerMinutes,
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E6DEC8] bg-white px-3.5 py-1.5 text-xs font-bold text-[#475569] hover:text-[#1E293B]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al explorador
      </button>

      <div className="overflow-hidden rounded-[32px] border border-[#ECE5D8] bg-white shadow-sm">
        <div className="grid items-center gap-6 bg-[#FAF7F2] p-6 sm:grid-cols-12 sm:p-8">
          <div className="sm:col-span-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F3FF] px-3 py-1 text-xs font-bold text-[#7C3AED]">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Modo Simulacro
            </span>
            <h1 className="font-display mt-3 text-2xl font-extrabold text-[#1E293B] sm:text-3xl">
              Configura tu evaluación
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#475569]">
              Responde sin pistas durante la prueba, mide tu tiempo real y
              recibe tu calificación sobre 5.0 con análisis de tus errores.
            </p>
          </div>
          <div className="sm:col-span-5">
            <img
              src="/images/mode-simulacro.jpg"
              alt="Modo Simulacro de Acento"
              className="mx-auto h-40 w-full rounded-2xl object-cover shadow-xs"
            />
          </div>
        </div>

        <div className="space-y-6 p-6 sm:p-8">
          {/* Language */}
          <div>
            <label className="font-display block text-sm font-bold text-[#1E293B]">
              1. Idioma del simulacro
            </label>
            <div className="mt-2.5 grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'en', label: 'Inglés' },
                  { id: 'fr', label: 'Francés' },
                  { id: 'both', label: 'Mixto (EN + FR)' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setLanguage(item.id);
                    setTopicSlug('');
                  }}
                  className={`rounded-2xl border-2 px-3 py-3 text-xs font-bold transition sm:text-sm ${
                    language === item.id
                      ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#6D28D9]'
                      : 'border-[#ECE5D8] bg-[#FAF7F2] text-[#475569] hover:border-[#CBD5E1]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <label className="font-display block text-sm font-bold text-[#1E293B]">
              2. Nivel académico
            </label>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(
                [
                  { id: 'A1', label: 'Nivel 1 · Primero' },
                  { id: 'A2', label: 'Nivel 2 · A2' },
                  { id: 'B1', label: 'Nivel 3 · B1' },
                  { id: 'all', label: 'Todos' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setLevel(item.id);
                    setTopicSlug('');
                  }}
                  className={`rounded-2xl border-2 px-3 py-2.5 text-xs font-bold transition ${
                    level === item.id
                      ? 'border-[#1E293B] bg-[#1E293B] text-white'
                      : 'border-[#ECE5D8] bg-[#FAF7F2] text-[#475569] hover:border-[#CBD5E1]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Specific Topic */}
          <div>
            <label
              htmlFor="simulacro-topic"
              className="font-display block text-sm font-bold text-[#1E293B]"
            >
              3. Tema específico (opcional)
            </label>
            <select
              id="simulacro-topic"
              value={topicSlug}
              onChange={(e) => setTopicSlug(e.target.value)}
              className="mt-2 w-full rounded-2xl border-2 border-[#ECE5D8] bg-[#FAF7F2] px-4 py-3 text-sm font-semibold text-[#1E293B] focus:border-[#7C3AED] focus:bg-white focus:outline-none"
            >
              <option value="">
                Todos los temas de esta selección ({matchingTopics.length} temas)
              </option>
              {matchingTopics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.language === 'en' ? 'Inglés' : 'Francés'} · {t.level} — {t.titleEs}
                </option>
              ))}
            </select>
          </div>

          {/* Question Count & Timer */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="font-display block text-sm font-bold text-[#1E293B]">
                4. Cantidad de preguntas
              </label>
              <div className="mt-2 flex gap-2">
                {([10, 15, 20] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`flex-1 rounded-2xl border-2 py-2.5 text-sm font-bold transition ${
                      questionCount === count
                        ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#6D28D9]'
                        : 'border-[#ECE5D8] bg-[#FAF7F2] text-[#475569]'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-display block text-sm font-bold text-[#1E293B]">
                5. Tiempo límite
              </label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {(
                  [
                    { val: 0, label: 'Libre' },
                    { val: 5, label: '5m' },
                    { val: 10, label: '10m' },
                    { val: 15, label: '15m' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.val}
                    type="button"
                    onClick={() => setTimerMinutes(t.val)}
                    className={`inline-flex items-center justify-center gap-1 rounded-2xl border-2 py-2.5 text-xs font-bold transition ${
                      timerMinutes === t.val
                        ? 'border-[#1E293B] bg-[#1E293B] text-white'
                        : 'border-[#ECE5D8] bg-[#FAF7F2] text-[#475569]'
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] px-6 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-[#6D28D9] active:translate-y-[1px]"
          >
            <Play className="h-5 w-5" />
            Comenzar Simulacro Ahora
          </button>
        </div>
      </div>
    </div>
  );
}
