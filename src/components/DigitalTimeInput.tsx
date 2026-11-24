'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import type { TimePeriod } from '@/types/time-workshop';
import { normalizeClockHour } from '@/lib/time-utils';

interface DigitalTimeInputProps {
  hours: number;
  minutes: number;
  period: TimePeriod;
  showPeriod?: boolean;
  disabled?: boolean;
  onChange: (hours: number, minutes: number, period: TimePeriod) => void;
}

export function DigitalTimeInput({
  hours,
  minutes,
  period,
  showPeriod = true,
  disabled = false,
  onChange,
}: DigitalTimeInputProps) {
  const safeH = normalizeClockHour(hours);
  const safeM = ((Math.round(minutes) % 60) + 60) % 60;

  const setHourValue = (next: number) => {
    if (disabled) return;
    onChange(normalizeClockHour(next), safeM, period);
  };

  const setMinuteValue = (next: number) => {
    if (disabled) return;
    const wrapped = ((next % 60) + 60) % 60;
    onChange(safeH, wrapped, period);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 rounded-3xl border border-[#ECE5D8] bg-[#FAF7F2] p-4 sm:p-5">
      {/* Hours Control */}
      <div className="flex flex-col items-center">
        <span className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
          Hora
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setHourValue(safeH - 1)}
            aria-label="Disminuir hora"
            className="flex h-9 w-8 items-center justify-center rounded-xl border border-[#E6DEC8] bg-white text-[#1E293B] shadow-2xs transition hover:bg-[#ECE5D8] disabled:opacity-50"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            min={1}
            max={12}
            disabled={disabled}
            value={safeH}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed)) {
                setHourValue(Math.max(1, Math.min(12, parsed)));
              }
            }}
            aria-label="Hora digital"
            className="font-display h-12 w-16 rounded-2xl border-2 border-[#DCD3C0] bg-white text-center text-2xl font-extrabold text-[#1E293B] focus:border-[#2563EB] focus:outline-none disabled:bg-[#ECFDF5] disabled:text-[#059669]"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setHourValue(safeH + 1)}
            aria-label="Aumentar hora"
            className="flex h-9 w-8 items-center justify-center rounded-xl border border-[#E6DEC8] bg-white text-[#1E293B] shadow-2xs transition hover:bg-[#ECE5D8] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <span className="font-display mt-4 text-3xl font-extrabold text-[#1E293B]">
        :
      </span>

      {/* Minutes Control */}
      <div className="flex flex-col items-center">
        <span className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
          Minutos
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMinuteValue(safeM - 5)}
            aria-label="Restar 5 minutos digitales"
            className="flex h-9 w-8 items-center justify-center rounded-xl border border-[#E6DEC8] bg-white text-[#D94646] shadow-2xs transition hover:bg-[#FEF2F2] disabled:opacity-50"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <input
            type="number"
            min={0}
            max={59}
            disabled={disabled}
            value={String(safeM).padStart(2, '0')}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              if (!Number.isNaN(parsed)) {
                setMinuteValue(Math.max(0, Math.min(59, parsed)));
              }
            }}
            aria-label="Minutos digitales"
            className="font-display h-12 w-16 rounded-2xl border-2 border-[#DCD3C0] bg-white text-center text-2xl font-extrabold text-[#1E293B] focus:border-[#2563EB] focus:outline-none disabled:bg-[#ECFDF5] disabled:text-[#059669]"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setMinuteValue(safeM + 5)}
            aria-label="Sumar 5 minutos digitales"
            className="flex h-9 w-8 items-center justify-center rounded-xl border border-[#E6DEC8] bg-white text-[#D94646] shadow-2xs transition hover:bg-[#FEF2F2] disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* AM / PM Selector */}
      {showPeriod && (
        <div className="flex flex-col items-center">
          <span className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
            Jornada
          </span>
          <div className="flex rounded-2xl border border-[#E6DEC8] bg-white p-1">
            {(['AM', 'PM'] as const).map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(safeH, safeM, p)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
                    active
                      ? 'bg-[#2563EB] text-white shadow-2xs'
                      : 'text-[#64748B] hover:text-[#1E293B]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
