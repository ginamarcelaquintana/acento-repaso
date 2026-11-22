'use client';

import React from 'react';
import {
  ArrowLeft,
  Flame,
  Gauge,
  GraduationCap,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { UserProgress } from '@/types/curriculum';

interface TopNavProps {
  progress: UserProgress;
  fromEnglishTech: boolean;
  onGoHome: () => void;
  onToggleMute: () => void;
  onToggleSlow: () => void;
  onOpenProgress: () => void;
}

export function TopNav({
  progress,
  fromEnglishTech,
  onGoHome,
  onToggleMute,
  onToggleSlow,
  onOpenProgress,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#ECE5D8] bg-[#FAF7F2]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="group flex items-center gap-2.5 rounded-2xl pr-2 text-left transition hover:opacity-90 active:translate-y-[1px]"
            aria-label="Ir al inicio de Acento"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D94646] via-[#E15B44] to-[#2563EB] text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <span className="font-display block text-lg font-extrabold leading-none tracking-tight text-[#1E293B]">
                Acento
              </span>
              <span className="mt-0.5 block text-[11px] font-medium text-[#64748B]">
                Inglés &amp; Francés
              </span>
            </div>
          </button>

          {fromEnglishTech && (
            <a
              href="https://englishtech.vercel.app"
              className="hidden items-center gap-1.5 rounded-full border border-[#E2D9C8] bg-white px-3 py-1.5 text-xs font-semibold text-[#1E293B] shadow-xs transition hover:border-[#D94646]/40 hover:text-[#D94646] sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a English TECH
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSlow}
            title={
              progress.voiceSlow
                ? 'Pronunciación pausada (0.8x) activa'
                : 'Activar pronunciación despacio (0.8x)'
            }
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:translate-y-[1px] ${
              progress.voiceSlow
                ? 'border-[#F59E0B] bg-[#FFFBEB] text-[#B45309]'
                : 'border-[#E6DEC8] bg-white text-[#475569] hover:border-[#CBD5E1]'
            }`}
          >
            <Gauge className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">0.8x</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={
              progress.voiceMuted ? 'Activar voz de la profe' : 'Silenciar voz'
            }
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:translate-y-[1px] ${
              progress.voiceMuted
                ? 'border-[#E2E8F0] bg-[#F1F5F9] text-[#64748B]'
                : 'border-[#E6DEC8] bg-white text-[#1E293B] hover:border-[#D94646]/40'
            }`}
          >
            <img
              src="/images/tutor-valeria.jpg"
              alt="Profe Valeria"
              className="h-5 w-5 rounded-full object-cover ring-1 ring-[#D94646]/30"
            />
            {progress.voiceMuted ? (
              <VolumeX className="h-3.5 w-3.5 text-[#64748B]" />
            ) : (
              <Volume2 className="h-3.5 w-3.5 text-[#D94646]" />
            )}
            <span className="hidden md:inline">
              {progress.voiceMuted ? 'Voz en pausa' : 'Voz Valeria'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenProgress}
            className="inline-flex items-center gap-2 rounded-full border border-[#F59E0B]/40 bg-[#FFFBEB] px-3 py-1.5 text-xs font-bold text-[#92400E] shadow-xs transition hover:bg-[#FEF3C7] active:translate-y-[1px]"
          >
            <Flame className="h-3.5 w-3.5 text-[#D97706]" />
            <span>{progress.streakDays}d</span>
            <span className="text-[#D97706]/50">·</span>
            <Sparkles className="h-3.5 w-3.5 text-[#D94646]" />
            <span>{progress.xp} XP</span>
          </button>
        </div>
      </div>
    </header>
  );
}
