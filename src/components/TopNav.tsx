'use client';

import React from 'react';
import {
  ArrowLeft,
  ClipboardCheck,
  GraduationCap,
  MessageCircle,
} from 'lucide-react';

interface TopNavProps {
  fromEnglishTech: boolean;
  onGoHome: () => void;
  onOpenSimulacro: () => void;
  onOpenTutoria: () => void;
}

export function TopNav({
  fromEnglishTech,
  onGoHome,
  onOpenSimulacro,
  onOpenTutoria,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#ECE5D8] bg-[#FAF7F2]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoHome}
            className="group flex items-center gap-2.5 rounded-2xl pr-2 text-left transition hover:opacity-90 active:translate-y-[1px]"
            aria-label="Ir al inicio de Accento"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D94646] via-[#E15B44] to-[#2563EB] text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <span className="font-display block text-lg font-extrabold leading-none tracking-tight text-[#1E293B]">
                Accento
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

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenSimulacro}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DEC8] bg-white px-3.5 py-2 text-xs font-bold text-[#1E293B] shadow-xs transition hover:border-[#7C3AED]/45 hover:text-[#7C3AED] active:translate-y-[1px]"
          >
            <ClipboardCheck className="h-3.5 w-3.5 text-[#7C3AED]" />
            <span>Simulacro</span>
          </button>

          <button
            type="button"
            onClick={onOpenTutoria}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#D94646] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#C23939] active:translate-y-[1px]"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Tutoría</span>
          </button>
        </div>
      </div>
    </header>
  );
}
