'use client';

import React from 'react';
import type { Topic } from '@/types/curriculum';

type VisualTheme =
  | 'greetings'
  | 'identity'
  | 'articles'
  | 'routine'
  | 'space'
  | 'family'
  | 'action'
  | 'questions'
  | 'past'
  | 'compare'
  | 'food'
  | 'bridge';

const SLUG_TO_THEME: Record<string, VisualTheme> = {
  'en-a1-greetings': 'greetings',
  'fr-a1-salutations': 'greetings',
  'en-a1-to-be': 'identity',
  'fr-a1-etre-avoir': 'identity',
  'en-a1-articles-nouns': 'articles',
  'fr-a1-articles-genre': 'articles',
  'en-a1-present-simple': 'routine',
  'fr-a1-verbes-er': 'routine',
  'fr-a1-nombres-heure': 'routine',
  'fr-a2-pronominaux': 'routine',
  'en-a1-there-is-place': 'space',
  'en-a2-prepositions-in-on-at': 'space',
  'en-a1-possessives-family': 'family',
  'fr-a1-possessifs-famille': 'family',
  'en-a1-present-continuous': 'action',
  'fr-a1-aller-faire-venir': 'action',
  'fr-a2-futur-passe-recent': 'action',
  'en-a1-wh-can': 'questions',
  'fr-a1-negation-questions': 'questions',
  'en-a2-past-simple': 'past',
  'fr-a2-passe-compose': 'past',
  'fr-b1-imparfait-pc': 'past',
  'en-a2-comparatives': 'compare',
  'en-a2-parts-order-adjectives': 'compare',
  'fr-b1-pronoms-comparatifs': 'compare',
  'fr-a2-partitifs-nourriture': 'food',
  'en-a2-adverbs-conjunctions': 'bridge',
  'en-b1-future-present-perfect': 'bridge',
  'en-b1-gerund-infinitive': 'bridge',
  'en-b1-conditionals-modals': 'bridge',
};

interface TopicVisualProps {
  topic: Topic;
  className?: string;
}

export function TopicVisual({ topic, className = 'h-full w-full' }: TopicVisualProps) {
  const theme: VisualTheme = SLUG_TO_THEME[topic.slug] ?? 'greetings';
  const primary = topic.language === 'en' ? '#D94646' : '#2563EB';
  const primarySoft = topic.language === 'en' ? '#FEE2E2' : '#DBEAFE';
  const primaryDeep = topic.language === 'en' ? '#B91C1C' : '#1D4ED8';

  return (
    <svg
      viewBox="0 0 320 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={topic.titleEs}
    >
      <rect width="320" height="180" fill="#FAF7F2" />

      {/* Soft ambient organic backdrop blob */}
      <ellipse cx="160" cy="95" rx="115" ry="62" fill={primarySoft} opacity="0.45" />

      {theme === 'greetings' && (
        <g>
          {/* Left coral/blue speech bubble */}
          <rect x="64" y="42" width="110" height="60" rx="18" fill={primary} />
          <path d="M84 102L72 118L104 102H84Z" fill={primary} />
          <circle cx="96" cy="72" r="5" fill="#FFFDF8" />
          <circle cx="118" cy="72" r="5" fill="#FFFDF8" opacity="0.8" />
          <circle cx="140" cy="72" r="5" fill="#FFFDF8" opacity="0.6" />

          {/* Right marigold reply bubble */}
          <rect x="148" y="68" width="112" height="58" rx="18" fill="#F59E0B" />
          <path d="M226 126L242 140L208 126H226Z" fill="#F59E0B" />
          <rect x="170" y="90" width="68" height="7" rx="3.5" fill="#FFFBEB" />
          <rect x="170" y="104" width="44" height="6" rx="3" fill="#FEF3C7" />

          {/* Warm ceramic coffee cup */}
          <path d="M86 126H122V142C122 150 114 156 104 156C94 156 86 150 86 142V126Z" fill="#FFFDF8" stroke="#D6CBB8" strokeWidth="2" />
          <path d="M122 130C128 130 131 134 131 138C131 142 128 145 122 145" stroke="#D6CBB8" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}

      {theme === 'identity' && (
        <g>
          {/* Student ID / Profile Card */}
          <rect x="78" y="34" width="164" height="112" rx="18" fill="#FFFDF8" stroke="#E2D9C8" strokeWidth="2.5" />
          <rect x="136" y="24" width="48" height="16" rx="8" fill={primary} />
          <circle cx="122" cy="86" r="24" fill={primarySoft} />
          <circle cx="122" cy="79" r="10" fill={primary} />
          <path d="M105 103C108 94 136 94 139 103" fill={primary} />
          <rect x="158" y="66" width="64" height="9" rx="4.5" fill="#1E293B" />
          <rect x="158" y="83" width="50" height="7" rx="3.5" fill="#94A3B8" />
          <rect x="158" y="98" width="56" height="7" rx="3.5" fill="#CBD5E1" />
          {/* Marigold badge star */}
          <circle cx="228" cy="126" r="16" fill="#F59E0B" />
          <path d="M228 117L230.6 122.4L236.5 123.2L232.2 127.4L233.2 133.2L228 130.4L222.8 133.2L223.8 127.4L219.5 123.2L225.4 122.4L228 117Z" fill="#FFFBEB" />
        </g>
      )}

      {theme === 'articles' && (
        <g>
          {/* Minimalist still life: Umbrella, Apple, Open Book */}
          {/* Umbrella */}
          <path d="M72 96C72 64 102 44 128 44C154 44 184 64 184 96H72Z" fill={primary} />
          <path d="M128 44V136C128 144 120 148 114 144" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          {/* Emerald apple */}
          <circle cx="188" cy="118" r="24" fill="#10B981" />
          <path d="M188 94C189 85 196 81 203 83C200 91 193 95 188 94Z" fill="#059669" />
          {/* Stacked colorful tag cards */}
          <rect x="198" y="48" width="64" height="36" rx="10" transform="rotate(-8 198 48)" fill="#F59E0B" />
          <circle cx="214" cy="64" r="4" fill="#FFFBEB" />
          <rect x="224" y="60" width="26" height="6" rx="3" fill="#FFFBEB" />
        </g>
      )}

      {theme === 'routine' && (
        <g>
          {/* Analog Morning Clock + Sunrise + Coffee */}
          <circle cx="116" cy="88" r="44" fill="#FFFDF8" stroke={primary} strokeWidth="5" />
          <circle cx="116" cy="88" r="4" fill="#1E293B" />
          <path d="M116 88V62" stroke="#1E293B" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M116 88L136 98" stroke={primary} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="116" cy="52" r="2.5" fill="#94A3B8" />
          <circle cx="116" cy="124" r="2.5" fill="#94A3B8" />
          <circle cx="80" cy="88" r="2.5" fill="#94A3B8" />
          <circle cx="152" cy="88" r="2.5" fill="#94A3B8" />

          {/* Checklist card */}
          <rect x="176" y="46" width="84" height="86" rx="14" fill="#FFFDF8" stroke="#E2D9C8" strokeWidth="2.5" />
          <circle cx="196" cy="70" r="7" fill="#D1FAE5" />
          <path d="M193 70L195.5 72.5L200 68" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
          <rect x="210" y="67" width="36" height="6" rx="3" fill="#334155" />

          <circle cx="196" cy="92" r="7" fill="#D1FAE5" />
          <path d="M193 92L195.5 94.5L200 90" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
          <rect x="210" y="89" width="32" height="6" rx="3" fill="#64748B" />

          <circle cx="196" cy="114" r="7" fill="#FEF3C7" />
          <rect x="210" y="111" width="28" height="6" rx="3" fill="#94A3B8" />
        </g>
      )}

      {theme === 'space' && (
        <g>
          {/* Cozy Illustrated Desk, Lamp, Box & Location Pins */}
          <rect x="64" y="116" width="192" height="12" rx="6" fill="#C4A484" />
          <rect x="82" y="128" width="10" height="30" rx="4" fill="#A68666" />
          <rect x="228" y="128" width="10" height="30" rx="4" fill="#A68666" />

          {/* Desk Lamp */}
          <path d="M96 116V74L114 58" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          <path d="M104 56L134 62L122 80L98 72Z" fill="#F59E0B" />
          <rect x="84" y="110" width="24" height="6" rx="3" fill="#334155" />

          {/* Open Box / Book on desk */}
          <rect x="148" y="84" width="54" height="32" rx="6" fill={primary} />
          <circle cx="175" cy="70" r="14" fill="#059669" />

          {/* Location Pin hovering */}
          <path d="M228 52C219 52 212 59 212 68C212 80 228 96 228 96C228 96 244 80 244 68C244 59 237 52 228 52Z" fill={primary} />
          <circle cx="228" cy="68" r="6" fill="#FFFDF8" />
        </g>
      )}

      {theme === 'family' && (
        <g>
          {/* Two overlapping Polaroid photo frames */}
          <g transform="rotate(-7 125 92)">
            <rect x="74" y="42" width="88" height="100" rx="10" fill="#FFFDF8" stroke="#E2D9C8" strokeWidth="2.5" />
            <rect x="82" y="50" width="72" height="64" rx="6" fill={primarySoft} />
            <circle cx="106" cy="74" r="10" fill={primary} />
            <circle cx="132" cy="80" r="8" fill="#F59E0B" />
            <path d="M90 106C94 92 118 92 122 106" fill={primary} />
            <path d="M118 106C122 96 142 96 146 106" fill="#F59E0B" />
          </g>
          <g transform="rotate(6 205 94)">
            <rect x="156" y="44" width="88" height="100" rx="10" fill="#FFFDF8" stroke="#E2D9C8" strokeWidth="2.5" />
            <rect x="164" y="52" width="72" height="64" rx="6" fill="#ECFDF5" />
            <circle cx="200" cy="78" r="12" fill="#059669" />
            <path d="M180 108C184 94 216 94 220 108" fill="#059669" />
            <path d="M196 128L200 124L204 128L200 133Z" fill="#D94646" />
          </g>
        </g>
      )}

      {theme === 'action' && (
        <g>
          {/* Dynamic compass / motion arcs / shoes */}
          <path d="M62 116C108 60 198 54 252 94" stroke={primary} strokeWidth="5" strokeLinecap="round" strokeDasharray="8 8" />
          <circle cx="160" cy="88" r="38" fill="#FFFDF8" stroke="#2563EB" strokeWidth="4" />
          <polygon points="160,58 170,88 160,96 150,88" fill="#D94646" />
          <polygon points="160,118 170,88 160,80 150,88" fill="#CBD5E1" />
          <circle cx="160" cy="88" r="5" fill="#1E293B" />

          {/* Floating motion pills */}
          <rect x="64" y="48" width="44" height="18" rx="9" fill="#059669" />
          <rect x="218" y="114" width="48" height="20" rx="10" fill="#F59E0B" />
        </g>
      )}

      {theme === 'questions' && (
        <g>
          {/* Sculpted Question Card + Key */}
          <rect x="76" y="40" width="96" height="96" rx="22" fill={primary} />
          <path
            d="M111 72C111 63 118 57 126 57C134 57 140 62 140 69C140 76 134 79 128 83C124 85 123 88 123 93"
            stroke="#FFFDF8"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="123" cy="109" r="4.5" fill="#FFFDF8" />

          {/* Directional signpost / golden key */}
          <circle cx="212" cy="78" r="22" fill="#F59E0B" />
          <circle cx="212" cy="78" r="9" fill="#FAF7F2" />
          <rect x="228" y="73" width="36" height="10" rx="5" fill="#F59E0B" />
          <rect x="248" y="80" width="8" height="14" rx="3" fill="#F59E0B" />
          <rect x="192" y="118" width="68" height="18" rx="9" fill="#059669" />
        </g>
      )}

      {theme === 'past' && (
        <g>
          {/* Warm Hourglass & Timeline Stepping Stones */}
          <rect x="80" y="40" width="64" height="8" rx="4" fill="#7C3AED" />
          <rect x="80" y="128" width="64" height="8" rx="4" fill="#7C3AED" />
          <path d="M88 48H136L114 88L136 128H88L110 88L88 48Z" fill="#FFFDF8" stroke="#7C3AED" strokeWidth="3" />
          <path d="M96 122H128L112 102L96 122Z" fill="#F59E0B" />

          {/* Vintage postcard with stamp */}
          <rect x="164" y="54" width="96" height="68" rx="12" fill="#FFFDF8" stroke="#E2D9C8" strokeWidth="2.5" />
          <rect x="228" y="64" width="22" height="26" rx="4" fill={primary} />
          <line x1="178" y1="84" x2="216" y2="84" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
          <line x1="178" y1="98" x2="238" y2="98" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}

      {theme === 'compare' && (
        <g>
          {/* Rising Podium Bars + Balance */}
          <rect x="74" y="96" width="46" height="44" rx="10" fill="#F59E0B" />
          <rect x="134" y="68" width="46" height="72" rx="10" fill="#059669" />
          <rect x="194" y="42" width="46" height="98" rx="10" fill={primary} />
          {/* Golden Crown/Star on tallest bar */}
          <circle cx="217" cy="28" r="10" fill="#F59E0B" />
          {/* Color swatches */}
          <circle cx="97" cy="72" r="12" fill="#2563EB" opacity="0.85" />
          <circle cx="157" cy="48" r="10" fill="#D94646" opacity="0.85" />
        </g>
      )}

      {theme === 'food' && (
        <g>
          {/* Parisian Bistro Croissant, Bowl & Espresso */}
          <ellipse cx="160" cy="134" rx="92" ry="16" fill="#E6DEC8" opacity="0.6" />
          <ellipse cx="152" cy="112" rx="56" ry="18" fill="#FFFDF8" stroke="#E2D9C8" strokeWidth="2.5" />
          <path
            d="M114 102C120 82 138 72 154 74C172 76 186 88 188 104C178 109 166 104 156 100C144 96 132 104 122 106C117 107 114 105 114 102Z"
            fill="#F59E0B"
            stroke="#B45309"
            strokeWidth="2"
          />
          <path d="M214 78H254V100C254 112 245 120 234 120C223 120 214 112 214 100V78Z" fill="#2563EB" />
          <ellipse cx="234" cy="78" rx="20" ry="6" fill="#7C4A2D" />
          {/* Baguette / Fruit */}
          <circle cx="88" cy="108" r="18" fill="#059669" />
        </g>
      )}

      {theme === 'bridge' && (
        <g>
          {/* Interlocking colorful arches / bridge */}
          <path d="M58 134C72 68 134 68 148 134" stroke={primary} strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M118 134C132 52 198 52 212 134" stroke="#F59E0B" strokeWidth="14" strokeLinecap="round" fill="none" />
          <path d="M178 134C192 68 248 68 262 134" stroke="#059669" strokeWidth="14" strokeLinecap="round" fill="none" />
          <circle cx="165" cy="40" r="10" fill={primaryDeep} />
        </g>
      )}
    </svg>
  );
}
