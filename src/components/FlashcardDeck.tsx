'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import type { Topic, UserProgress } from '@/types/curriculum';
import { voiceEngine } from '@/lib/voice-engine';
import { TutorBubble } from './TutorBubble';

interface FlashcardDeckProps {
  topic: Topic;
  progress: UserProgress;
  onBack: () => void;
  onMarkMastered: (cardId: string) => void;
  onStartRepaso: () => void;
}

export function FlashcardDeck({
  topic,
  progress,
  onBack,
  onMarkMastered,
  onStartRepaso,
}: FlashcardDeckProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const cards = topic.flashcards;
  const current = cards[index];
  const isEn = topic.language === 'en';
  const targetVoiceMode = isEn ? 'en' : 'fr';

  useEffect(() => {
    return () => {
      voiceEngine.stop();
    };
  }, [topic.slug]);

  const speakCard = (text: string) => {
    voiceEngine.speak({
      text,
      mode: targetVoiceMode,
      targetLang: topic.language,
      muted: false,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  if (!current) return null;

  const isMastered = progress.masteredFlashcardIds.includes(current.id);

  const handleNext = (mastered: boolean) => {
    if (mastered) onMarkMastered(current.id);
    setFlipped(false);
    if (index + 1 < cards.length) {
      setIndex((i) => i + 1);
    } else {
      setIndex(0);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DEC8] bg-white px-3.5 py-1.5 text-xs font-bold text-[#475569] hover:text-[#1E293B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al tema
        </button>

        <span className="text-xs font-bold text-[#64748B]">
          Tarjeta {index + 1} de {cards.length}
        </span>
      </div>

      <TutorBubble
        message="Toca la tarjeta para girarla, oye la pronunciación y márcala cuando ya te la sepas."
        mood="neutral"
        isSpeaking={isSpeaking}
      />

      <div className="card-perspective mt-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
          className={`card-inner relative h-72 w-full cursor-pointer sm:h-80 ${
            flipped ? 'is-flipped' : ''
          }`}
        >
          <div className="card-face absolute inset-0 flex flex-col justify-between rounded-[32px] border-2 border-[#ECE5D8] bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  isEn
                    ? 'bg-[#FEF2F2] text-[#D94646]'
                    : 'bg-[#EFF6FF] text-[#2563EB]'
                }`}
              >
                {isEn ? 'Inglés' : 'Francés'} · {topic.titleEs}
              </span>
              {isMastered && (
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold text-[#059669]">
                  ✓ Dominada
                </span>
              )}
            </div>

            <div className="text-center">
              <p className="font-display text-2xl font-extrabold text-[#1E293B] sm:text-3xl">
                {current.front}
              </p>
              {current.phoneticHint && (
                <p className="mt-2 text-xs font-semibold text-[#94A3B8]">
                  {current.phoneticHint}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => speakCard(current.front)}
                  aria-label="Pronunciar"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1E293B] text-white transition hover:bg-[#0F172A]"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
              <span className="text-xs font-semibold text-[#94A3B8]">
                Toca para girar ↻
              </span>
            </div>
          </div>

          <div className="card-face card-face-back absolute inset-0 flex flex-col justify-between rounded-[32px] border-2 border-[#F59E0B]/50 bg-[#FFFBEB] p-7 shadow-sm">
            <span className="inline-block w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-[#B45309]">
              Significado y uso real
            </span>

            <div className="text-center">
              <p className="font-display text-2xl font-extrabold text-[#1E293B]">
                {current.back}
              </p>
              <div className="mt-4 rounded-2xl bg-white/90 p-3.5 text-left">
                <p className="text-sm font-bold text-[#1E293B]">
                  {current.example}
                </p>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  {current.exampleEs}
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => speakCard(current.example)}
                aria-label="Pronunciar ejemplo"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#D97706] text-white transition hover:bg-[#B45309]"
              >
                <Volume2 className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-[#92400E]">
                Toca para volver ↻
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => handleNext(false)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#E6DEC8] bg-white px-4 py-3 text-xs font-bold text-[#475569] transition hover:bg-[#FAF7F2]"
        >
          <RotateCcw className="h-4 w-4" />
          Repasar de nuevo
        </button>

        <button
          type="button"
          onClick={() => handleNext(true)}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#059669] px-4 py-3 text-xs font-bold text-white shadow-xs transition hover:bg-[#047857]"
        >
          <Check className="h-4 w-4" />
          Ya me la sé
        </button>

        <button
          type="button"
          onClick={onStartRepaso}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E293B] px-5 py-3 text-sm font-bold text-white sm:w-auto"
        >
          <span>Ir al Repaso Guiado</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
