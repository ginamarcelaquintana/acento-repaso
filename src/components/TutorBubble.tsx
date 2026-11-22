'use client';

import React from 'react';
import { Gauge, RotateCcw, Volume2 } from 'lucide-react';
import { PointingHandCue } from './EditorialIllustrations';

export type TutorMood = 'neutral' | 'praise' | 'coaching' | 'celebration';

interface TutorBubbleProps {
  message: string;
  mood?: TutorMood;
  isSpeaking?: boolean;
  isSlow?: boolean;
  clueLabel?: string;
  onReplay?: () => void;
  onToggleSlow?: () => void;
}

export function TutorBubble({
  message,
  mood = 'neutral',
  isSpeaking = false,
  isSlow = false,
  clueLabel,
  onReplay,
  onToggleSlow,
}: TutorBubbleProps) {
  const toneClasses =
    mood === 'coaching'
      ? 'border-[#F59E0B] bg-[#FFFBEB] shadow-[0_10px_28px_-10px_rgba(245,158,11,0.3)]'
      : mood === 'praise' || mood === 'celebration'
        ? 'border-[#10B981]/50 bg-[#ECFDF5] shadow-[0_10px_28px_-10px_rgba(5,150,105,0.2)]'
        : 'border-[#ECE5D8] bg-white shadow-[0_8px_24px_-10px_rgba(30,41,59,0.08)]';

  return (
    <div
      className={`relative flex flex-col gap-3 rounded-3xl border p-4 transition-all sm:flex-row sm:items-center sm:gap-4 ${toneClasses}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <img
            src="/images/tutor-valeria.jpg"
            alt="Profe Valeria"
            className={`h-14 w-14 rounded-2xl object-cover shadow-sm ring-2 ${
              mood === 'coaching'
                ? 'ring-[#F59E0B]'
                : mood === 'praise' || mood === 'celebration'
                  ? 'ring-[#059669]'
                  : 'ring-[#D94646]/25'
            }`}
          />
          {isSpeaking && (
            <span
              aria-label="Hablando"
              className="absolute -bottom-1.5 -right-1.5 flex h-6 items-end gap-0.5 rounded-full border border-white bg-[#1E293B] px-2 py-1 shadow-sm"
            >
              <span className="h-3 w-0.5 origin-bottom rounded-full bg-[#FBBF24] animate-voice-bar-1" />
              <span className="h-3.5 w-0.5 origin-bottom rounded-full bg-[#F87171] animate-voice-bar-2" />
              <span className="h-2.5 w-0.5 origin-bottom rounded-full bg-[#34D399] animate-voice-bar-3" />
            </span>
          )}
        </div>

        <div className="min-w-0 sm:hidden">
          <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            Profe Valeria
          </p>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            Profe Valeria
          </span>
          {mood === 'coaching' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-bold text-[#92400E]">
              Segunda mirada
            </span>
          )}
        </div>

        <p className="mt-0.5 text-sm font-semibold leading-snug text-[#1E293B] sm:text-[15px]">
          {message}
        </p>

        {mood === 'coaching' && clueLabel && (
          <div className="mt-2.5 flex items-center gap-2.5 rounded-2xl border border-[#F59E0B]/45 bg-white/95 px-3 py-2">
            <span className="shrink-0 animate-point-nudge">
              <PointingHandCue className="h-7 w-7" />
            </span>
            <span className="text-xs font-semibold text-[#92400E] sm:text-sm">
              {clueLabel}
            </span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
        {onReplay && (
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DEC8] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#334155] transition hover:border-[#D94646]/40 hover:text-[#D94646] active:translate-y-[1px]"
            title="Volver a escuchar"
          >
            {isSpeaking ? (
              <Volume2 className="h-3.5 w-3.5 text-[#D94646]" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>Escuchar</span>
          </button>
        )}
        {onToggleSlow && (
          <button
            type="button"
            onClick={onToggleSlow}
            className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition active:translate-y-[1px] ${
              isSlow
                ? 'border-[#F59E0B] bg-[#FEF3C7] text-[#92400E]'
                : 'border-[#E6DEC8] bg-white text-[#64748B] hover:text-[#1E293B]'
            }`}
            title="Pronunciación pausada"
          >
            <Gauge className="h-3.5 w-3.5" />
            <span>0.8x</span>
          </button>
        )}
      </div>
    </div>
  );
}
