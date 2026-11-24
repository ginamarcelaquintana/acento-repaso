'use client';

import React, { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { formatDigital, normalizeClockHour } from '@/lib/time-utils';

interface InteractiveAnalogClockProps {
  hours: number;
  minutes: number;
  interactive?: boolean;
  disabled?: boolean;
  showDidacticZones?: boolean;
  hideDigitalHint?: boolean;
  size?: 'sm' | 'md';
  onChange?: (nextHours: number, nextMinutes: number) => void;
}

const DIAL_NUMBERS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function InteractiveAnalogClock({
  hours,
  minutes,
  interactive = false,
  disabled = false,
  showDidacticZones = false,
  hideDigitalHint = true,
  size = 'md',
  onChange,
}: InteractiveAnalogClockProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<'minute' | 'hour'>('minute');

  const safeH = normalizeClockHour(hours);
  const safeM = ((Math.round(minutes) % 60) + 60) % 60;

  const minuteAngle = safeM * 6;
  const hourAngle = (safeH % 12) * 30 + safeM * 0.5;

  const applyPointerPosition = (clientX: number, clientY: number) => {
    if (!interactive || disabled || !onChange || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;

    // 0 degrees at 12 o'clock, increasing clockwise
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;

    if (dragTarget === 'hour') {
      const hRaw = Math.round(deg / 30) % 12;
      const nextH = hRaw === 0 ? 12 : hRaw;
      onChange(nextH, safeM);
    } else {
      // Snap to nearest 5 minutes for accurate, pleasant classroom precision
      const mRaw = (Math.round(deg / 30) * 5) % 60;
      onChange(safeH, mRaw);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    applyPointerPosition(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !interactive || disabled) return;
    applyPointerPosition(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const adjustHour = (delta: number) => {
    if (!interactive || disabled || !onChange) return;
    onChange(normalizeClockHour(safeH + delta), safeM);
  };

  const adjustMinute = (delta: number) => {
    if (!interactive || disabled || !onChange) return;
    const total = safeM + delta;
    if (total >= 60) {
      onChange(normalizeClockHour(safeH + 1), total % 60);
    } else if (total < 0) {
      onChange(normalizeClockHour(safeH - 1), ((total % 60) + 60) % 60);
    } else {
      onChange(safeH, total);
    }
  };

  const maxSizeClass = size === 'sm' ? 'max-w-[215px]' : 'max-w-[270px]';

  return (
    <div className="flex flex-col items-center">
      {interactive && !disabled && (
        <div className="mb-2.5 flex rounded-full border border-[#E6DEC8] bg-[#FAF7F2] p-0.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setDragTarget('minute')}
            className={`rounded-full px-3 py-1 transition ${
              dragTarget === 'minute'
                ? 'bg-[#D94646] text-white shadow-2xs'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Mover minutero
          </button>
          <button
            type="button"
            onClick={() => setDragTarget('hour')}
            className={`rounded-full px-3 py-1 transition ${
              dragTarget === 'hour'
                ? 'bg-[#1E293B] text-white shadow-2xs'
                : 'text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            Mover horario
          </button>
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox="0 0 320 320"
        role="img"
        aria-label={`Reloj analógico marcando las ${safeH}:${String(safeM).padStart(2, '0')}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full ${maxSizeClass} select-none ${
          interactive && !disabled ? 'cursor-pointer touch-none' : ''
        }`}
      >
        {/* Outer soft bezel */}
        <circle
          cx="160"
          cy="160"
          r="150"
          fill="#FFFDF9"
          stroke="#E2D9C8"
          strokeWidth="6"
        />

        {/* Optional Didactic PAST / TO halves */}
        {showDidacticZones && (
          <g>
            {/* Right half (12 -> 6): PAST in soft emerald */}
            <path
              d="M 160 22 A 138 138 0 0 1 160 298 L 160 160 Z"
              fill="#10B981"
              fillOpacity="0.11"
            />
            {/* Left half (6 -> 12): TO in soft coral */}
            <path
              d="M 160 298 A 138 138 0 0 1 160 22 L 160 160 Z"
              fill="#D94646"
              fillOpacity="0.1"
            />
            <text
              x="225"
              y="164"
              textAnchor="middle"
              fill="#059669"
              fontSize="13"
              fontWeight="800"
              opacity="0.72"
            >
              PAST
            </text>
            <text
              x="95"
              y="164"
              textAnchor="middle"
              fill="#D94646"
              fontSize="13"
              fontWeight="800"
              opacity="0.72"
            >
              TO
            </text>
          </g>
        )}

        {/* Subtle inner dashed guide circle */}
        <circle
          cx="160"
          cy="160"
          r="138"
          fill="none"
          stroke="#EFE8DA"
          strokeWidth="1.5"
        />

        {/* 60 Minute Ticks */}
        {Array.from({ length: 60 }, (_, idx) => {
          const isHourMark = idx % 5 === 0;
          const angle = idx * 6;
          return (
            <line
              key={idx}
              x1="160"
              y1={isHourMark ? '24' : '27'}
              x2="160"
              y2={isHourMark ? '36' : '32'}
              stroke={isHourMark ? '#475569' : '#CBD5E1'}
              strokeWidth={isHourMark ? '3' : '1.4'}
              strokeLinecap="round"
              transform={`rotate(${angle} 160 160)`}
            />
          );
        })}

        {/* Numerals 1..12 */}
        {DIAL_NUMBERS.map((num, idx) => {
          const rad = ((idx * 30 - 90) * Math.PI) / 180;
          const r = 109;
          const x = 160 + r * Math.cos(rad);
          const y = 160 + r * Math.sin(rad) + 6;
          return (
            <text
              key={num}
              x={x}
              y={y}
              textAnchor="middle"
              fill="#1E293B"
              fontSize="20"
              fontWeight="800"
            >
              {num}
            </text>
          );
        })}

        {/* Didactic quarter markers */}
        {showDidacticZones && (
          <g fontSize="9.5" fontWeight="700">
            <text x="160" y="76" textAnchor="middle" fill="#475569">
              o&apos;clock
            </text>
            <text x="234" y="143" textAnchor="middle" fill="#059669">
              quarter
            </text>
            <text x="160" y="246" textAnchor="middle" fill="#059669">
              half past
            </text>
            <text x="86" y="143" textAnchor="middle" fill="#D94646">
              quarter
            </text>
          </g>
        )}

        {/* Hour Hand (Shorter, Slate) */}
        <g transform={`rotate(${hourAngle} 160 160)`}>
          <line
            x1="160"
            y1="168"
            x2="160"
            y2="98"
            stroke="#1E293B"
            strokeWidth="8.5"
            strokeLinecap="round"
          />
          {interactive && !disabled && dragTarget === 'hour' && (
            <circle
              cx="160"
              cy="98"
              r="7.5"
              fill="#1E293B"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
          )}
        </g>

        {/* Minute Hand (Longer, Coral/Red) */}
        <g transform={`rotate(${minuteAngle} 160 160)`}>
          <line
            x1="160"
            y1="170"
            x2="160"
            y2="54"
            stroke="#D94646"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {interactive && !disabled && dragTarget === 'minute' && (
            <circle
              cx="160"
              cy="56"
              r="7.5"
              fill="#D94646"
              stroke="#FFFFFF"
              strokeWidth="2.5"
            />
          )}
        </g>

        {/* Center Pivot */}
        <circle cx="160" cy="160" r="8" fill="#1E293B" />
        <circle cx="160" cy="160" r="3.5" fill="#FAF7F2" />
      </svg>

      {!hideDigitalHint && (
        <span className="mt-1.5 rounded-full border border-[#E6DEC8] bg-[#FAF7F2] px-3 py-0.5 text-xs font-extrabold text-[#1E293B]">
          {formatDigital(safeH, safeM)}
        </span>
      )}

      {interactive && !disabled && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-[#E6DEC8] bg-[#FAF7F2] px-2 py-1">
            <button
              type="button"
              onClick={() => adjustHour(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[#1E293B] shadow-2xs transition hover:bg-[#ECE5D8]"
              aria-label="Restar 1 hora"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-extrabold text-[#1E293B]">
              Hora
            </span>
            <button
              type="button"
              onClick={() => adjustHour(1)}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[#1E293B] shadow-2xs transition hover:bg-[#ECE5D8]"
              aria-label="Sumar 1 hora"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-[#E6DEC8] bg-[#FAF7F2] px-2 py-1">
            <button
              type="button"
              onClick={() => adjustMinute(-5)}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[#D94646] shadow-2xs transition hover:bg-[#FEF2F2]"
              aria-label="Restar 5 minutos"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-extrabold text-[#D94646]">
              5 min
            </span>
            <button
              type="button"
              onClick={() => adjustMinute(5)}
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[#D94646] shadow-2xs transition hover:bg-[#FEF2F2]"
              aria-label="Sumar 5 minutos"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
