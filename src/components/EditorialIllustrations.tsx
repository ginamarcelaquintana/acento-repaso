'use client';

import React from 'react';

interface IllustrationProps {
  className?: string;
}

export function FrenchTrackIllustration({ className = 'w-full h-auto' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 640 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Ilustración editorial para aprendizaje de francés"
    >
      <defs>
        <linearGradient id="frPaperBg" x1="0" y1="0" x2="640" y2="360" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FAF7F2" />
          <stop offset="100%" stopColor="#F5EFE4" />
        </linearGradient>
        <linearGradient id="frNotebookCover" x1="115" y1="150" x2="345" y2="310" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="frCroissant" x1="395" y1="195" x2="500" y2="255" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      <rect width="640" height="360" fill="url(#frPaperBg)" />

      {/* Subtle Eiffel Tower silhouette in warm taupe-beige */}
      <g opacity="0.22" fill="#B89F84">
        <path d="M478 46L485 112L506 206L524 238H500C496 220 486 212 478 212C470 212 460 220 456 238H432L450 206L471 112L478 46Z" />
        <rect x="475" y="28" width="6" height="22" rx="3" />
        <rect x="462" y="122" width="32" height="7" rx="3.5" />
        <rect x="448" y="172" width="60" height="8" rx="4" />
      </g>

      {/* Parisian Cafe Bistro Awning Silhouette */}
      <g opacity="0.2">
        <path d="M210 74H356L368 112H198L210 74Z" fill="#93C5FD" />
        <path d="M210 74H236L230 112H198L210 74Z" fill="#2563EB" />
        <path d="M266 74H296L294 112H262L266 74Z" fill="#2563EB" />
        <path d="M326 74H356L368 112H334L326 74Z" fill="#2563EB" />
        <rect x="206" y="112" width="6" height="96" fill="#B89F84" />
        <rect x="352" y="112" width="6" height="96" fill="#B89F84" />
      </g>

      {/* Botanical emerald sprig */}
      <g>
        <path d="M126 258C104 228 96 184 108 144" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="96" cy="196" rx="18" ry="8" transform="rotate(-32 96 196)" fill="#10B981" />
        <ellipse cx="122" cy="182" rx="18" ry="8" transform="rotate(28 122 182)" fill="#059669" />
        <ellipse cx="98" cy="158" rx="16" ry="7" transform="rotate(-24 98 158)" fill="#059669" />
        <ellipse cx="120" cy="144" rx="15" ry="7" transform="rotate(30 120 144)" fill="#34D399" />
      </g>

      {/* Open Cobalt-Blue Sketchbook */}
      <g>
        <ellipse cx="235" cy="306" rx="124" ry="16" fill="#E5DEC9" opacity="0.7" />
        <path d="M116 206L228 172L334 214L222 252L116 206Z" fill="url(#frNotebookCover)" />
        <path d="M116 206V282L222 308V232L116 206Z" fill="#1E40AF" />
        <path d="M222 232L346 196V270L222 308V232Z" fill="#2563EB" />
        <path d="M128 198L222 224L336 188L244 162L128 198Z" fill="#FFFDF8" stroke="#E5DDD0" strokeWidth="2" />
        <path d="M222 224V306" stroke="#1E3A8A" strokeWidth="3" />
        {/* Warm coral ribbon bookmark */}
        <path d="M242 220V296L250 288L258 298V216Z" fill="#D94646" />
        {/* Ruled lines inside sketchbook */}
        <path d="M152 196L208 212" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M144 205L200 221" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M238 206L302 186" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M242 216L294 199" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Espresso cup + saucer */}
      <g>
        <ellipse cx="384" cy="212" rx="46" ry="12" fill="#EAE2D3" stroke="#D6CBB8" strokeWidth="2" />
        <path d="M350 162H418V184C418 200 403 210 384 210C365 210 350 200 350 184V162Z" fill="#FFFDF8" stroke="#D6CBB8" strokeWidth="2" />
        <path d="M418 168C428 168 432 174 432 180C432 187 427 192 416 192" stroke="#D6CBB8" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="384" cy="162" rx="34" ry="8" fill="#7C4A2D" />
        <path d="M372 146C366 134 378 124 372 110" stroke="#D6CBB8" strokeWidth="3" strokeLinecap="round" />
        <path d="M394 144C389 131 400 121 394 108" stroke="#D6CBB8" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Golden Flaky Croissant on ceramic plate */}
      <g>
        <ellipse cx="468" cy="248" rx="64" ry="17" fill="#FFFDF8" stroke="#E2D9C8" strokeWidth="2" />
        <path
          d="M422 238C428 216 449 204 470 206C492 208 510 221 514 240C503 246 490 242 478 238C465 234 448 242 434 245C428 246 423 242 422 238Z"
          fill="url(#frCroissant)"
          stroke="#B45309"
          strokeWidth="2"
        />
        <path d="M447 210C449 221 448 231 444 241" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
        <path d="M469 207C471 218 469 228 465 237" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
        <path d="M490 212C490 222 487 232 482 239" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Floating speech/review cards matching track-english.jpg */}
      <g>
        <rect x="448" y="274" width="76" height="44" rx="9" transform="rotate(-6 448 274)" fill="#2563EB" />
        <circle cx="470" cy="294" r="4" fill="#DBEAFE" />
        <path d="M480 292H508" stroke="#DBEAFE" strokeWidth="3" strokeLinecap="round" />
        <path d="M468 302H500" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />

        <rect x="516" y="256" width="74" height="44" rx="9" transform="rotate(7 516 256)" fill="#F59E0B" />
        <ellipse cx="552" cy="278" rx="14" ry="9" fill="none" stroke="#FFFBEB" strokeWidth="2.5" />

        <rect x="378" y="278" width="66" height="40" rx="9" transform="rotate(4 378 278)" fill="#D94646" />
        <path d="M394 294H426M394 302H416" stroke="#FEE2E2" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function RepasoModeIllustration({ className = 'w-full h-auto' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 480 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Ilustración editorial del modo repaso guiado"
    >
      <rect width="480" height="360" fill="#FAF7F2" />

      {/* Soft ambient acoustic arcs */}
      <g opacity="0.7">
        <path d="M188 92C214 72 266 72 292 92" stroke="#D94646" strokeWidth="4" strokeLinecap="round" />
        <path d="M206 112C225 98 255 98 274 112" stroke="#F59E0B" strokeWidth="4" strokeLinecap="round" />
        <circle cx="240" cy="126" r="6" fill="#D94646" />
      </g>

      {/* Shadow */}
      <ellipse cx="240" cy="296" rx="158" ry="18" fill="#E6DEC8" opacity="0.65" />

      {/* Open Guided Notebook */}
      <g>
        <rect x="92" y="148" width="296" height="142" rx="14" fill="#D94646" />
        <rect x="102" y="140" width="136" height="140" rx="8" fill="#FFFDF8" stroke="#E7DFD1" strokeWidth="2" />
        <rect x="242" y="140" width="136" height="140" rx="8" fill="#FFFDF8" stroke="#E7DFD1" strokeWidth="2" />
        <line x1="240" y1="140" x2="240" y2="280" stroke="#D4C9B8" strokeWidth="3" />

        {/* Left page lines + coral highlight */}
        <rect x="122" y="166" width="84" height="14" rx="4" fill="#FEE2E2" />
        <line x1="126" y1="173" x2="196" y2="173" stroke="#D94646" strokeWidth="3" strokeLinecap="round" />
        <line x1="122" y1="198" x2="212" y2="198" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
        <line x1="122" y1="218" x2="198" y2="218" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
        <rect x="122" y="236" width="76" height="14" rx="4" fill="#FEF3C7" />
        <line x1="126" y1="243" x2="188" y2="243" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />

        {/* Right page checkmarks + cobalt notes */}
        <circle cx="268" cy="174" r="9" fill="#D1FAE5" />
        <path d="M264 174L267 177L273 171" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="286" y1="174" x2="352" y2="174" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />

        <circle cx="268" cy="206" r="9" fill="#DBEAFE" />
        <path d="M264 206L267 209L273 203" stroke="#2563EB" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="286" y1="206" x2="344" y2="206" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />

        <circle cx="268" cy="238" r="9" fill="#D1FAE5" />
        <path d="M264 238L267 241L273 235" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="286" y1="238" x2="334" y2="238" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* Marigold Highlighter & Fountain Pen */}
      <g transform="rotate(-18 355 245)">
        <rect x="342" y="168" width="22" height="106" rx="6" fill="#F59E0B" />
        <rect x="342" y="168" width="22" height="22" rx="4" fill="#B45309" />
        <path d="M347 168L353 154L359 168Z" fill="#FDE68A" />
      </g>

      {/* Emerald botanical leaf */}
      <g>
        <path d="M74 256C64 232 66 206 82 184" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="64" cy="222" rx="14" ry="6" transform="rotate(-35 64 222)" fill="#10B981" />
        <ellipse cx="86" cy="206" rx="14" ry="6" transform="rotate(28 86 206)" fill="#059669" />
      </g>
    </svg>
  );
}

export function FlashcardsModeIllustration({ className = 'w-full h-auto' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 480 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Ilustración editorial de tarjetas de memoria con audio"
    >
      <rect width="480" height="360" fill="#FAF7F2" />

      <ellipse cx="240" cy="292" rx="146" ry="16" fill="#E6DEC8" opacity="0.65" />

      {/* Back card - Amber */}
      <g transform="rotate(-10 210 185)">
        <rect x="116" y="102" width="198" height="136" rx="18" fill="#F59E0B" />
        <rect x="132" y="122" width="62" height="10" rx="5" fill="#FEF3C7" />
        <rect x="132" y="144" width="132" height="10" rx="5" fill="#FDE68A" opacity="0.8" />
      </g>

      {/* Middle card - Cobalt */}
      <g transform="rotate(7 260 190)">
        <rect x="158" y="96" width="198" height="136" rx="18" fill="#2563EB" />
        <rect x="176" y="118" width="84" height="10" rx="5" fill="#DBEAFE" />
        <rect x="176" y="140" width="118" height="10" rx="5" fill="#93C5FD" />
      </g>

      {/* Front card - Warm Ivory with Coral border & Audio */}
      <g>
        <rect x="134" y="128" width="212" height="142" rx="20" fill="#FFFDF8" stroke="#D94646" strokeWidth="3.5" />
        <circle cx="170" cy="164" r="16" fill="#FEE2E2" />
        <path d="M166 158V170L176 164L166 158Z" fill="#D94646" />
        <rect x="198" y="156" width="112" height="14" rx="7" fill="#1E293B" />
        <rect x="160" y="196" width="144" height="10" rx="5" fill="#CBD5E1" />
        <rect x="160" y="218" width="98" height="10" rx="5" fill="#E2E8F0" />

        {/* Emerald star badge */}
        <circle cx="332" cy="140" r="22" fill="#059669" />
        <path
          d="M332 126L335.8 133.7L344.3 134.9L338.1 140.9L339.6 149.4L332 145.4L324.4 149.4L325.9 140.9L319.7 134.9L328.2 133.7L332 126Z"
          fill="#FDE68A"
        />
      </g>
    </svg>
  );
}

export function PointingHandCue({ className = 'w-8 h-8' }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="22" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2.5" />
      <path
        d="M15 26C13.8 26 13 25 13 23.8C13 22.6 13.8 21.6 15 21.6H26.5L34.5 21.6C35.9 21.6 37 22.7 37 24C37 25.3 35.9 26.4 34.5 26.4H26.5"
        fill="#FBBF24"
        stroke="#92400E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 26.4H26.2C27.5 26.4 28.5 27.3 28.5 28.5C28.5 29.7 27.5 30.6 26.2 30.6H22.8M22.8 30.6H24.6C25.8 30.6 26.8 31.5 26.8 32.6C26.8 33.7 25.8 34.6 24.6 34.6H18.5C15.5 34.6 13.5 32.5 13.5 29.5V24C13.5 21.5 15.5 19.5 18 19.5H20.8L22.6 15.8C23.2 14.5 24.7 14 25.9 14.6C27 15.2 27.4 16.5 26.9 17.7L25.4 21.6"
        fill="#FDE68A"
        stroke="#92400E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
