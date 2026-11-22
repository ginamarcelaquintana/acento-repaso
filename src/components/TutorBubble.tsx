'use client';

import React from 'react';
import { PointingHandCue } from './EditorialIllustrations';

export type TutorMood = 'neutral' | 'praise' | 'coaching' | 'celebration';

interface TutorBubbleProps {
  message: string;
  mood?: TutorMood;
  isSpeaking?: boolean;
  clueLabel?: string;
}

export function TutorBubble({
  message,
  mood = 'neutral',
  isSpeaking = false,
  clueLabel,
}: TutorBubbleProps) {
  const toneClasses =
    mood === 'coaching'
      ? 'border-[#F59E0B] bg-[#FFFBEB] shadow-[0_10px_28px_-10px_rgba(245,158,11,0.3)]'
      : mood === 'praise' || mood === 'celebration'
        ? 'border-[#10B981]/50 bg-[#ECFDF5] shadow-[0_10px_28px_-10px_rgba(5,150,105,0.2)]'
        : 'border-[#ECE5D8] bg-white shadow-[0_8px_24px_-10px_rgba(30,41,59,0.08)]';

  return (
    <div
      className={`relative flex items-center gap-3.5 rounded-3xl border p-4 transition-all sm:gap-4 ${toneClasses}`}
    >
      <div className="relative shrink-0">
        <img
          src="/images/tutor-valeria.jpg"
          alt="Tutoría"
          className={`h-13 w-13 rounded-2xl object-cover shadow-sm ring-2 ${
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
            className="absolute -bottom-1.5 -right-1.5 flex h-5 items-end gap-0.5 rounded-full border border-white bg-[#1E293B] px-1.5 py-1 shadow-sm"
          >
            <span className="h-2.5 w-0.5 origin-bottom rounded-full bg-[#FBBF24] animate-voice-bar-1" />
            <span className="h-3 w-0.5 origin-bottom rounded-full bg-[#F87171] animate-voice-bar-2" />
            <span className="h-2 w-0.5 origin-bottom rounded-full bg-[#34D399] animate-voice-bar-3" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {mood === 'coaching' && (
          <span className="mb-1 inline-flex items-center rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[11px] font-bold text-[#92400E]">
            Segunda mirada
          </span>
        )}

        <p className="text-sm font-semibold leading-snug text-[#1E293B] sm:text-[15px]">
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
    </div>
  );
}
