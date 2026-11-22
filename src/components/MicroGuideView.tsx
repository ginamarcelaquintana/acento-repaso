'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Layers,
  Play,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { StudyMode, Topic, UserProgress } from '@/types/curriculum';
import { voiceEngine } from '@/lib/voice-engine';
import { TutorBubble } from './TutorBubble';

interface MicroGuideViewProps {
  topic: Topic;
  progress: UserProgress;
  onBack: () => void;
  onSelectMode: (mode: StudyMode) => void;
  onToggleSlow: () => void;
}

export function MicroGuideView({
  topic,
  progress,
  onBack,
  onSelectMode,
  onToggleSlow,
}: MicroGuideViewProps) {
  const [speakingText, setSpeakingText] = useState<string | null>(null);
  const isEn = topic.language === 'en';
  const targetMode = isEn ? 'en' : 'fr';

  const speakPhrase = (text: string) => {
    voiceEngine.speak({
      text,
      mode: targetMode,
      slow: progress.voiceSlow,
      muted: false,
      onStart: () => setSpeakingText(text),
      onEnd: () => setSpeakingText(null),
    });
  };

  const speakIntro = () => {
    voiceEngine.speak({
      text: `Vamos a darle una mirada rápida a ${topic.titleEs}. Toca cualquier ejemplo para escucharlo clarito antes de empezar tu repaso.`,
      mode: 'es-CO',
      slow: progress.voiceSlow,
      muted: false,
      onStart: () => setSpeakingText('__intro__'),
      onEnd: () => setSpeakingText(null),
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#E6DEC8] bg-white px-3.5 py-1.5 text-xs font-bold text-[#475569] transition hover:text-[#1E293B]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al explorador
      </button>

      {/* Topic Header */}
      <div className="rounded-3xl border border-[#ECE5D8] bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              isEn
                ? 'bg-[#FEF2F2] text-[#D94646]'
                : 'bg-[#EFF6FF] text-[#2563EB]'
            }`}
          >
            {isEn ? 'Inglés' : 'Francés'} ·{' '}
            {topic.level === 'A1' ? 'Nivel 1 (Primero)' : `Nivel ${topic.level}`}
          </span>
          <span className="rounded-full bg-[#FAF7F2] px-3 py-1 text-xs font-semibold text-[#64748B]">
            {topic.category}
          </span>
        </div>

        <h1 className="font-display mt-3 text-2xl font-extrabold text-[#1E293B] sm:text-3xl">
          {topic.titleEs}
        </h1>
        <p className="mt-1 text-sm font-semibold text-[#64748B]">
          {topic.titleTarget}
        </p>
        <p className="mt-2.5 text-sm leading-relaxed text-[#475569]">
          {topic.shortDescEs}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onSelectMode('repaso')}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm transition active:translate-y-[1px] ${
              isEn
                ? 'bg-[#D94646] hover:bg-[#C23939]'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
            }`}
          >
            <Play className="h-4 w-4" />
            Empezar Repaso Guiado
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('tarjetas')}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E6DEC8] bg-[#FAF7F2] px-4 py-3 text-sm font-bold text-[#1E293B] transition hover:bg-[#F1ECE2]"
          >
            <Layers className="h-4 w-4 text-[#D97706]" />
            Tarjetas con Audio ({topic.flashcards.length})
          </button>

          <button
            type="button"
            onClick={() => onSelectMode('simulacro')}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E6DEC8] bg-white px-4 py-3 text-sm font-bold text-[#7C3AED] transition hover:bg-[#F5F3FF]"
          >
            <ClipboardCheck className="h-4 w-4" />
            Simulacro del tema
          </button>
        </div>
      </div>

      <div className="mt-5">
        <TutorBubble
          message="Esta es la micro-guía rápida. Escucha cada ejemplo tocando el botón de audio y luego arranca tu repaso."
          mood="neutral"
          isSpeaking={speakingText === '__intro__'}
          isSlow={progress.voiceSlow}
          onReplay={speakIntro}
          onToggleSlow={onToggleSlow}
        />
      </div>

      {/* Micro-Guide Cards */}
      <div className="mt-5 space-y-4">
        {topic.microGuide.map((point, index) => (
          <div
            key={point.title}
            className="rounded-3xl border border-[#ECE5D8] bg-white p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white ${
                  isEn ? 'bg-[#D94646]' : 'bg-[#2563EB]'
                }`}
              >
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base font-extrabold text-[#1E293B] sm:text-lg">
                  {point.title}
                </h2>
                {point.formula && (
                  <p className="mt-2 inline-block rounded-xl border border-[#E6DEC8] bg-[#FAF7F2] px-3 py-1.5 text-xs font-bold text-[#1E293B] sm:text-sm">
                    {point.formula}
                  </p>
                )}
                <p className="mt-2.5 text-sm leading-relaxed text-[#475569]">
                  {point.tip}
                </p>

                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {point.examples.map((ex) => {
                    const active = speakingText === ex.target;
                    return (
                      <button
                        key={ex.target}
                        type="button"
                        onClick={() => speakPhrase(ex.target)}
                        className={`flex items-start justify-between gap-3 rounded-2xl border p-3.5 text-left transition ${
                          active
                            ? 'border-[#D94646] bg-[#FEF2F2]/60'
                            : 'border-[#ECE5D8] bg-[#FAF7F2]/70 hover:border-[#CBD5E1] hover:bg-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#1E293B]">
                            {ex.target}
                          </p>
                          <p className="mt-0.5 text-xs text-[#64748B]">
                            {ex.spanish}
                          </p>
                          {ex.note && (
                            <span className="mt-1.5 inline-block rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-[#D97706]">
                              {ex.note}
                            </span>
                          )}
                        </div>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#D94646] shadow-xs">
                          <Volume2 className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Common Mistake Callout */}
      <div className="mt-5 rounded-3xl border border-[#F59E0B]/45 bg-[#FFFBEB] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[#B45309]">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-display text-base font-extrabold">
            Ojo con este error clásico
          </h3>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2 rounded-2xl bg-white/90 p-3.5">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D94646]" />
            <div>
              <p className="text-[11px] font-bold uppercase text-[#D94646]">
                Evita decir
              </p>
              <p className="mt-0.5 text-sm font-semibold text-[#1E293B] line-through decoration-[#D94646]/60">
                {topic.commonMistake.wrong}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-2xl bg-white/90 p-3.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
            <div>
              <p className="text-[11px] font-bold uppercase text-[#059669]">
                Dilo así
              </p>
              <p className="mt-0.5 text-sm font-bold text-[#1E293B]">
                {topic.commonMistake.right}
              </p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#78350F] sm:text-sm">
          {topic.commonMistake.whyEs}
        </p>
      </div>
    </div>
  );
}
