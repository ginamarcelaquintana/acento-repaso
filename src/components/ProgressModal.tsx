'use client';

import React from 'react';
import { Award, Flame, RotateCcw, Sparkles, X } from 'lucide-react';
import type { Topic, UserProgress } from '@/types/curriculum';
import { BADGE_DEFINITIONS } from '@/lib/adaptive-engine';

interface ProgressModalProps {
  isOpen: boolean;
  progress: UserProgress;
  allTopics: Topic[];
  onClose: () => void;
  onResetProgress: () => void;
}

export function ProgressModal({
  isOpen,
  progress,
  allTopics,
  onClose,
  onResetProgress,
}: ProgressModalProps) {
  if (!isOpen) return null;

  const enTopics = allTopics.filter((t) => t.language === 'en');
  const frTopics = allTopics.filter((t) => t.language === 'fr');
  const a1Topics = allTopics.filter((t) => t.level === 'A1');

  const avgMastery = (list: Topic[]) => {
    if (list.length === 0) return 0;
    const total = list.reduce(
      (sum, t) => sum + (progress.topicStats[t.slug]?.masteryPct ?? 0),
      0
    );
    return Math.round(total / list.length);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#ECE5D8] bg-[#FAF7F2] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/tutor-valeria.jpg"
              alt="Profe Valeria"
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-[#F59E0B]/40"
            />
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#1E293B]">
                Tu Progreso en Acento
              </h2>
              <p className="text-xs font-medium text-[#64748B]">
                Cada repaso y simulacro suma experiencia real
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E6DEC8] bg-white p-2 text-[#64748B] transition hover:text-[#1E293B]"
            aria-label="Cerrar progreso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#ECE5D8] bg-white p-4 text-center">
            <Sparkles className="mx-auto h-5 w-5 text-[#D94646]" />
            <p className="font-display mt-1.5 text-2xl font-extrabold text-[#1E293B]">
              {progress.xp}
            </p>
            <p className="text-xs font-medium text-[#64748B]">Puntos XP</p>
          </div>
          <div className="rounded-2xl border border-[#ECE5D8] bg-white p-4 text-center">
            <Flame className="mx-auto h-5 w-5 text-[#F59E0B]" />
            <p className="font-display mt-1.5 text-2xl font-extrabold text-[#1E293B]">
              {progress.streakDays} {progress.streakDays === 1 ? 'día' : 'días'}
            </p>
            <p className="text-xs font-medium text-[#64748B]">Racha activa</p>
          </div>
          <div className="rounded-2xl border border-[#ECE5D8] bg-white p-4 text-center">
            <Award className="mx-auto h-5 w-5 text-[#059669]" />
            <p className="font-display mt-1.5 text-2xl font-extrabold text-[#1E293B]">
              {progress.unlockedBadges.length}/{BADGE_DEFINITIONS.length}
            </p>
            <p className="text-xs font-medium text-[#64748B]">Medallas</p>
          </div>
        </div>

        <div className="mt-5 space-y-3 rounded-2xl border border-[#ECE5D8] bg-white p-4">
          <h3 className="font-display text-sm font-bold text-[#1E293B]">
            Dominio por ruta
          </h3>
          {[
            { label: 'Bases de Primero (A1)', pct: avgMastery(a1Topics), color: 'bg-[#F59E0B]' },
            { label: 'Inglés (A1 → B1)', pct: avgMastery(enTopics), color: 'bg-[#D94646]' },
            { label: 'Francés (A1 → B1)', pct: avgMastery(frTopics), color: 'bg-[#2563EB]' },
          ].map((bar) => (
            <div key={bar.label}>
              <div className="mb-1 flex justify-between text-xs font-semibold text-[#475569]">
                <span>{bar.label}</span>
                <span>{bar.pct}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[#F1ECE2]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${bar.color}`}
                  style={{ width: `${bar.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <h3 className="font-display mb-2.5 text-sm font-bold text-[#1E293B]">
            Tus medallas
          </h3>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {BADGE_DEFINITIONS.map((badge) => {
              const unlocked = progress.unlockedBadges.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`flex items-start gap-3 rounded-2xl border p-3 transition ${
                    unlocked
                      ? 'border-[#10B981]/40 bg-white'
                      : 'border-[#ECE5D8] bg-[#F6F2EA] opacity-65'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      unlocked
                        ? 'bg-[#ECFDF5] text-[#059669]'
                        : 'bg-white text-[#94A3B8]'
                    }`}
                  >
                    <Award className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-[#1E293B]">
                      {badge.titleEs}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-[#64748B]">
                      {badge.descEs}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[#ECE5D8] pt-4">
          <span className="text-xs text-[#64748B]">
            {progress.missedQuestionIds.length} dudas pendientes por reforzar
          </span>
          <button
            type="button"
            onClick={onResetProgress}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#64748B] transition hover:bg-white hover:text-[#D94646]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar estadísticas
          </button>
        </div>
      </div>
    </div>
  );
}
