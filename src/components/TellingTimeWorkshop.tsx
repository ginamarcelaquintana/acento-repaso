'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bus,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCopy,
  HelpCircle,
  Lightbulb,
  Mail,
  MessageCircle,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type {
  TimePeriod,
  TimeWorkshopExercise,
  TimeWorkshopSection,
} from '@/types/time-workshop';
import {
  ALL_TIME_EXERCISES,
  TIME_WORKSHOP_SECTIONS,
} from '@/data/telling-time-workshop';
import { PRAISE_EN, PhraseDeck } from '@/data/tutor-phrases';
import {
  diagnoseTimeWritingMistake,
  formatDigital,
  matchesAcceptedTimePhrase,
  normalizeClockHour,
  timeToDigitalEnglish,
  timeToTraditionalEnglish,
} from '@/lib/time-utils';
import { voiceEngine } from '@/lib/voice-engine';
import { DigitalTimeInput } from './DigitalTimeInput';
import { PointingHandCue } from './EditorialIllustrations';
import { InteractiveAnalogClock } from './InteractiveAnalogClock';
import { TutorBubble, type TutorMood } from './TutorBubble';

const TIME_STORAGE_KEY = 'accento_time_workshop_v1';

type ConfidenceRating = 'clear' | 'medium' | 'doubt';

interface TimeExerciseState {
  solved?: boolean;
  attempts?: number;
  revealed?: boolean;
  hintLevel?: 0 | 1 | 2 | 3;
  // Clock draft
  clockHours?: number;
  clockMinutes?: number;
  // Digital draft
  digitalHours?: number;
  digitalMinutes?: number;
  digitalPeriod?: TimePeriod;
  // Written phrase draft
  textInput?: string;
  // Reading choice draft
  selectedChoice?: number;
  // Feedback space
  confidence?: ConfidenceRating;
  feedbackNote?: string;
  aiTutorReply?: string;
}

type TimeWorkshopStore = Record<string, TimeExerciseState>;

interface TellingTimeWorkshopProps {
  voiceMuted?: boolean;
  onBack: () => void;
}

function loadTimeStore(): TimeWorkshopStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TIME_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object'
      ? (parsed as TimeWorkshopStore)
      : {};
  } catch {
    return {};
  }
}

function saveTimeStore(store: TimeWorkshopStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TIME_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

export function TellingTimeWorkshop({
  voiceMuted = false,
  onBack,
}: TellingTimeWorkshopProps) {
  const [sectionId, setSectionId] = useState<string>(TIME_WORKSHOP_SECTIONS[0].id);
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [showLabGuide, setShowLabGuide] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // Interactive Lab Clock state
  const [labHours, setLabHours] = useState(8);
  const [labMinutes, setLabMinutes] = useState(45);

  const [store, setStore] = useState<TimeWorkshopStore>({});
  const [hydrated, setHydrated] = useState(false);

  const [tutorMessage, setTutorMessage] = useState(
    'Observa el reloj o escucha la frase con calma e intenta resolver este punto. Si necesitas orientación, aparecerá una pista paso a paso para guiarte.'
  );
  const [tutorMood, setTutorMood] = useState<TutorMood>('neutral');
  const [activeClue, setActiveClue] = useState<string | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [tutorLoading, setTutorLoading] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Silent inactivity tracker — never exposed or displayed in UI
  const lastActivityRef = useRef<number>(0);
  const praiseDeckRef = useRef(new PhraseDeck(PRAISE_EN));

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setStore(loadTimeStore());
      lastActivityRef.current = Date.now();
      setHydrated(true);
    });
    return () => {
      window.cancelAnimationFrame(raf);
      voiceEngine.stop();
    };
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveTimeStore(store);
    }
  }, [store, hydrated]);

  const currentSection: TimeWorkshopSection = useMemo(
    () =>
      TIME_WORKSHOP_SECTIONS.find((s) => s.id === sectionId) ??
      TIME_WORKSHOP_SECTIONS[0],
    [sectionId]
  );

  const exercises = currentSection.exercises;
  const exercise: TimeWorkshopExercise | undefined =
    exercises[exerciseIdx] ?? exercises[0];

  const exState: TimeExerciseState = useMemo(
    () => (exercise ? store[exercise.id] ?? {} : {}),
    [store, exercise]
  );

  const isSolved = Boolean(exState.solved);
  const hintLevel: 0 | 1 | 2 | 3 = exState.hintLevel ?? 0;

  const updateExerciseState = useCallback(
    (
      exId: string,
      updater: (prev: TimeExerciseState) => TimeExerciseState
    ) => {
      setStore((prev) => ({
        ...prev,
        [exId]: updater(prev[exId] ?? {}),
      }));
    },
    []
  );

  const registerActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const speakEnglish = useCallback((phrase: string, slow = false) => {
    voiceEngine.speak({
      text: phrase,
      mode: 'en',
      targetLang: 'en',
      slow,
      muted: false,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, []);

  const speakCoach = useCallback(
    (message: string, mood: TutorMood, clue?: string) => {
      setTutorMessage(message);
      setTutorMood(mood);
      setActiveClue(clue);
      if (!voiceMuted) {
        voiceEngine.speak({
          text: clue ?? message,
          mode: 'es-CO',
          targetLang: 'en',
          muted: false,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }
    },
    [voiceMuted]
  );

  // Silent progressive coaching every 30s of inactivity (30s -> Level 1, 60s -> Level 2, 90s -> Level 3)
  // Zero elapsed time indicators shown anywhere in UI
  useEffect(() => {
    if (!hydrated || !exercise || isSolved || showSummary) return;

    const timer = window.setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - lastActivityRef.current) / 1000
      );

      if (elapsedSeconds >= 90 && hintLevel < 3) {
        const clue = exercise.progressiveHints[2];
        updateExerciseState(exercise.id, (prev) => ({ ...prev, hintLevel: 3 }));
        speakCoach(
          'Vamos a resolverlo juntos paso a paso con esta guía más directa:',
          'coaching',
          clue
        );
      } else if (elapsedSeconds >= 60 && hintLevel < 2) {
        const clue = exercise.progressiveHints[1];
        updateExerciseState(exercise.id, (prev) => ({ ...prev, hintLevel: 2 }));
        speakCoach(
          'Fíjate en esta segunda pista de apoyo para ubicar la hora con seguridad:',
          'coaching',
          clue
        );
      } else if (elapsedSeconds >= 30 && hintLevel < 1) {
        const clue = exercise.progressiveHints[0];
        updateExerciseState(exercise.id, (prev) => ({ ...prev, hintLevel: 1 }));
        speakCoach(
          'Tómate tu ritmo con tranquilidad. Mira esta primera pista para orientarte:',
          'coaching',
          clue
        );
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    hydrated,
    exercise,
    isSolved,
    showSummary,
    hintLevel,
    updateExerciseState,
    speakCoach,
  ]);

  const goToExercise = useCallback(
    (nextSectionId: string, nextIdx: number) => {
      voiceEngine.stop();
      setSectionId(nextSectionId);
      setExerciseIdx(nextIdx);
      setShowSummary(false);
      lastActivityRef.current = Date.now();

      const sec = TIME_WORKSHOP_SECTIONS.find((s) => s.id === nextSectionId);
      const target = sec?.exercises[nextIdx];
      const saved = target ? store[target.id] : undefined;

      if (saved?.solved) {
        setTutorMessage(
          'Este ejercicio ya quedó resuelto. Puedes volver a escucharlo o revisar la retroalimentación abajo.'
        );
        setTutorMood('praise');
        setActiveClue(undefined);
      } else if (saved?.hintLevel && saved.hintLevel > 0 && target) {
        setTutorMessage('Retomamos este ejercicio con tu pista de apoyo activa.');
        setTutorMood('coaching');
        setActiveClue(target.progressiveHints[saved.hintLevel - 1]);
      } else {
        setTutorMessage(
          'Analiza la hora con calma y arma tu respuesta paso a paso.'
        );
        setTutorMood('neutral');
        setActiveClue(undefined);
      }
    },
    [store]
  );

  const handleManualHint = () => {
    if (!exercise) return;
    registerActivity();
    const nextLvl = Math.min(3, hintLevel + 1) as 1 | 2 | 3;
    const clue = exercise.progressiveHints[nextLvl - 1];
    updateExerciseState(exercise.id, (prev) => ({
      ...prev,
      hintLevel: Math.max(prev.hintLevel ?? 0, nextLvl) as 0 | 1 | 2 | 3,
    }));
    speakCoach(
      'Mira esta orientación paso a paso (sin regalarte aún la respuesta):',
      'coaching',
      clue
    );
  };

  const handleRevealGuided = () => {
    if (!exercise) return;
    registerActivity();
    updateExerciseState(exercise.id, (prev) => ({
      ...prev,
      solved: true,
      revealed: true,
      hintLevel: 3,
      clockHours: exercise.targetHours,
      clockMinutes: exercise.targetMinutes,
      digitalHours: exercise.targetHours,
      digitalMinutes: exercise.targetMinutes,
      digitalPeriod: exercise.targetPeriod ?? prev.digitalPeriod ?? 'AM',
    }));
    setTutorMood('neutral');
    setActiveClue(undefined);
    setTutorMessage(
      `Mira cómo quedaba este punto y escucha la pronunciación modelo: ${exercise.feedbackEs}`
    );
    if (!voiceMuted) {
      speakEnglish(exercise.spokenModelEn);
    }
  };

  const celebrateSuccess = (
    ex: TimeWorkshopExercise,
    patch?: Partial<TimeExerciseState>
  ) => {
    updateExerciseState(ex.id, (prev) => ({
      ...prev,
      ...patch,
      solved: true,
    }));
    const praise = praiseDeckRef.current.next();
    setTutorMood('praise');
    setActiveClue(undefined);
    setTutorMessage(praise.display);

    if (!voiceMuted) {
      voiceEngine.speak({
        text: praise.speakText,
        mode: praise.voiceMode,
        targetLang: 'en',
        muted: false,
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          speakEnglish(ex.spokenModelEn);
        },
      });
    }
  };

  const coachWrongAttempt = (
    ex: TimeWorkshopExercise,
    specificNote: string | null,
    patch?: Partial<TimeExerciseState>
  ) => {
    const nextAttempts = (exState.attempts ?? 0) + 1;
    const nextLvl = Math.min(3, Math.max(hintLevel + 1, 1)) as 1 | 2 | 3;
    updateExerciseState(ex.id, (prev) => ({
      ...prev,
      ...patch,
      attempts: nextAttempts,
      hintLevel: nextLvl,
    }));

    const clue = specificNote ?? ex.progressiveHints[nextLvl - 1];
    speakCoach(
      nextAttempts === 1
        ? '¡Casi! Revisa este detalle antes de volverlo a intentar:'
        : 'Vamos paso a paso con esta guía más precisa:',
      'coaching',
      clue
    );
  };

  // Current effective clock / digital values for active exercise
  const clockH = exState.clockHours ?? 12;
  const clockM = exState.clockMinutes ?? 0;
  const digH = exState.digitalHours ?? 12;
  const digM = exState.digitalMinutes ?? 0;
  const digPeriod: TimePeriod = exState.digitalPeriod ?? 'AM';

  const checkAnalogClockMatch = (ex: TimeWorkshopExercise): boolean =>
    normalizeClockHour(clockH) === normalizeClockHour(ex.targetHours) &&
    ((clockM % 60) + 60) % 60 === ((ex.targetMinutes % 60) + 60) % 60;

  const checkDigitalMatch = (ex: TimeWorkshopExercise): boolean => {
    const hmOk =
      normalizeClockHour(digH) === normalizeClockHour(ex.targetHours) &&
      ((digM % 60) + 60) % 60 === ((ex.targetMinutes % 60) + 60) % 60;
    if (!ex.targetPeriod) return hmOk;
    return hmOk && digPeriod === ex.targetPeriod;
  };

  const diagnoseClockError = (ex: TimeWorkshopExercise): string | null => {
    const targetH = normalizeClockHour(ex.targetHours);
    const targetM = ex.targetMinutes;
    const hDiff = normalizeClockHour(clockH) !== targetH;
    const mDiff = clockM !== targetM;

    if (!hDiff && mDiff) {
      return '¡La aguja de la hora ya apunta bien! Solo falta ajustar el minutero rojo al minuto exacto.';
    }
    if (hDiff && !mDiff) {
      if (targetM > 30 && normalizeClockHour(clockH) === normalizeClockHour(targetH + 1)) {
        return `¡Ojo con la trampa de "to"! Cuando faltan minutos para la hora ${normalizeClockHour(targetH + 1)}, la aguja todavía está en la hora ${targetH}.`;
      }
      return 'El minutero rojo ya está perfecto; ajusta la manecilla corta de la hora.';
    }
    return null;
  };

  const diagnoseDigitalError = (ex: TimeWorkshopExercise): string | null => {
    const targetH = normalizeClockHour(ex.targetHours);
    const targetM = ex.targetMinutes;
    const hmOk =
      normalizeClockHour(digH) === targetH && digM === targetM;

    if (hmOk && ex.targetPeriod && digPeriod !== ex.targetPeriod) {
      return `¡Los números ${formatDigital(digH, digM)} están exactos! Revisa solo si es AM (mañana/madrugada) o PM (tarde/noche/mediodía).`;
    }
    if (targetM > 30 && normalizeClockHour(digH) === normalizeClockHour(targetH + 1)) {
      return `Recuerda que "to" indica minutos ANTES de la siguiente hora, así que en formato digital la hora sigue siendo ${String(targetH).padStart(2, '0')}.`;
    }
    return null;
  };

  const handleCheckActiveExercise = () => {
    if (!exercise || isSolved) return;
    registerActivity();

    switch (exercise.kind) {
      case 'set-clock':
      case 'listen-clock':
      case 'reading-clock': {
        if (checkAnalogClockMatch(exercise)) {
          celebrateSuccess(exercise);
        } else {
          coachWrongAttempt(exercise, diagnoseClockError(exercise));
        }
        break;
      }

      case 'listen-digital':
      case 'reading-digital': {
        if (checkDigitalMatch(exercise)) {
          celebrateSuccess(exercise);
        } else {
          coachWrongAttempt(exercise, diagnoseDigitalError(exercise));
        }
        break;
      }

      case 'write-words':
      case 'reading-write': {
        const rawText = exState.textInput ?? '';
        const ok = matchesAcceptedTimePhrase(
          rawText,
          exercise.acceptedPhrases ?? [],
          exercise.targetHours,
          exercise.targetMinutes,
          !exercise.requirePastToStyle
        );
        if (ok) {
          celebrateSuccess(exercise);
        } else {
          coachWrongAttempt(
            exercise,
            diagnoseTimeWritingMistake(
              rawText,
              exercise.targetHours,
              exercise.targetMinutes,
              Boolean(exercise.requirePastToStyle)
            )
          );
        }
        break;
      }

      case 'reading-choice': {
        if (exState.selectedChoice === exercise.correctChoiceIndex) {
          celebrateSuccess(exercise);
        } else {
          coachWrongAttempt(
            exercise,
            'Vuelve a revisar AM/PM y el significado de "midnight" vs "in the morning" dentro del aviso.'
          );
        }
        break;
      }

      case 'triple-challenge': {
        const clockOk = checkAnalogClockMatch(exercise);
        const digitalOk = checkDigitalMatch(exercise);
        const wordsOk = matchesAcceptedTimePhrase(
          exState.textInput ?? '',
          exercise.acceptedPhrases ?? [],
          exercise.targetHours,
          exercise.targetMinutes,
          !exercise.requirePastToStyle
        );

        if (clockOk && digitalOk && wordsOk) {
          celebrateSuccess(exercise);
          return;
        }

        const rightParts: string[] = [];
        const pendingParts: string[] = [];
        if (clockOk) rightParts.push('Reloj');
        else pendingParts.push('Reloj');
        if (digitalOk) rightParts.push('Número digital');
        else pendingParts.push('Número digital');
        if (wordsOk) rightParts.push('Hora en letra');
        else pendingParts.push('Hora en letra');

        const wordDiag = !wordsOk
          ? diagnoseTimeWritingMistake(
              exState.textInput ?? '',
              exercise.targetHours,
              exercise.targetMinutes,
              Boolean(exercise.requirePastToStyle)
            )
          : null;

        const diagnostic = [
          rightParts.length > 0 ? `Ya lograste: ${rightParts.join(' y ')}.` : '',
          `Falta ajustar: ${pendingParts.join(', ')}.`,
          wordDiag ?? '',
        ]
          .filter(Boolean)
          .join(' ');

        coachWrongAttempt(exercise, diagnostic);
        break;
      }
    }
  };

  const handleAskFeedbackTutor = async () => {
    if (!exercise || tutorLoading) return;
    registerActivity();
    setTutorLoading(true);

    const summaryPieces = [
      exState.textInput ? `texto="${exState.textInput}"` : '',
      exState.clockHours ? `reloj=${formatDigital(clockH, clockM)}` : '',
      exState.digitalHours
        ? `digital=${formatDigital(digH, digM)} ${digPeriod}`
        : '',
      exState.feedbackNote ? `nota estudiante="${exState.feedbackNote}"` : '',
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          topicSlug: 'en-a1-telling-time',
          topicTitle: 'Decir la hora en inglés (Telling the Time A1)',
          language: 'en',
          level: 'A1',
          questionPrompt: exercise.promptEs,
          studentDoubt: summaryPieces
            ? `Revisa mi avance (${summaryPieces}) y dame retroalimentación cálida A1 sin darme la respuesta hecha.`
            : 'Explícame paso a paso cómo pensar este ejercicio de la hora sin regalarme la solución.',
          currentHint: exercise.progressiveHints[Math.max(0, hintLevel - 1)],
          // Never pass full feedbackEs before exercise is solved so local fallback stays socratic
          currentExplanation: isSolved
            ? exercise.feedbackEs
            : exercise.progressiveHints[Math.min(2, hintLevel)],
        }),
      });
      const data = (await res.json()) as { reply?: string };
      const reply = data.reply?.trim() || exercise.progressiveHints[0];
      updateExerciseState(exercise.id, (prev) => ({
        ...prev,
        aiTutorReply: reply,
      }));
      if (!voiceMuted) {
        voiceEngine.speak({
          text: reply,
          mode: 'es-CO',
          targetLang: 'en',
          muted: false,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }
    } catch {
      updateExerciseState(exercise.id, (prev) => ({
        ...prev,
        aiTutorReply: isSolved
          ? exercise.feedbackEs
          : exercise.progressiveHints[0],
      }));
    } finally {
      setTutorLoading(false);
    }
  };

  const totalSolved = useMemo(
    () => ALL_TIME_EXERCISES.filter((e) => store[e.id]?.solved).length,
    [store]
  );

  const moveNext = () => {
    if (exerciseIdx + 1 < exercises.length) {
      goToExercise(currentSection.id, exerciseIdx + 1);
      return;
    }
    const secIdx = TIME_WORKSHOP_SECTIONS.findIndex(
      (s) => s.id === currentSection.id
    );
    if (secIdx >= 0 && secIdx + 1 < TIME_WORKSHOP_SECTIONS.length) {
      goToExercise(TIME_WORKSHOP_SECTIONS[secIdx + 1].id, 0);
      return;
    }
    setShowSummary(true);
  };

  const movePrev = () => {
    if (exerciseIdx > 0) {
      goToExercise(currentSection.id, exerciseIdx - 1);
      return;
    }
    const secIdx = TIME_WORKSHOP_SECTIONS.findIndex(
      (s) => s.id === currentSection.id
    );
    if (secIdx > 0) {
      const prevSec = TIME_WORKSHOP_SECTIONS[secIdx - 1];
      goToExercise(prevSec.id, prevSec.exercises.length - 1);
    }
  };

  const handleCopyReport = async () => {
    const lines: string[] = [
      'ACCENTO — TALLER GUIADO: DECIR LA HORA EN INGLÉS (A1 UNIVERSITARIO)',
      `Avance total: ${totalSolved}/${ALL_TIME_EXERCISES.length} ejercicios`,
      '',
    ];
    for (const sec of TIME_WORKSHOP_SECTIONS) {
      lines.push(`=== ${sec.titleEs} ===`);
      for (const ex of sec.exercises) {
        const st = store[ex.id];
        const status = st?.solved ? 'Resuelto' : 'Pendiente';
        const conf =
          st?.confidence === 'clear'
            ? 'Lo entendí claro'
            : st?.confidence === 'medium'
              ? 'Me costó un poco'
              : st?.confidence === 'doubt'
                ? 'Tengo duda'
                : 'Sin autoevaluar';
        const note = st?.feedbackNote?.trim()
          ? ` | Nota: ${st.feedbackNote.trim()}`
          : '';
        lines.push(
          `  ${sec.numberLabel}.${ex.number} (${ex.skillTag}): ${status} (${conf})${note}`
        );
      }
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2400);
    } catch {
      // Clipboard not available
    }
  };

  if (!exercise) return null;

  const isClockInteractive =
    exercise.kind === 'set-clock' ||
    exercise.kind === 'listen-clock' ||
    exercise.kind === 'reading-clock' ||
    exercise.kind === 'triple-challenge';

  const isDigitalInteractive =
    exercise.kind === 'listen-digital' ||
    exercise.kind === 'reading-digital' ||
    exercise.kind === 'triple-challenge';

  const isWordsInteractive =
    exercise.kind === 'write-words' ||
    exercise.kind === 'reading-write' ||
    exercise.kind === 'triple-challenge';

  const ReadingIcon =
    exercise.readingCard?.style === 'email'
      ? Mail
      : exercise.readingCard?.style === 'chat'
        ? MessageCircle
        : exercise.readingCard?.style === 'bus'
          ? Bus
          : exercise.readingCard?.style === 'notice'
            ? BookOpen
            : Calendar;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DEC8] bg-white px-3.5 py-1.5 text-xs font-bold text-[#475569] transition hover:text-[#1E293B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver al inicio
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLabGuide((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              showLabGuide
                ? 'border-[#059669] bg-[#ECFDF5] text-[#059669]'
                : 'border-[#E6DEC8] bg-white text-[#1E293B] hover:border-[#059669]/45'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>
              {showLabGuide
                ? 'Ocultar reloj laboratorio y guía'
                : 'Reloj laboratorio y guía visual'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSummary((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1E293B] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#0F172A]"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            <span>
              {showSummary
                ? 'Volver al ejercicio'
                : `Resumen (${totalSolved}/${ALL_TIME_EXERCISES.length})`}
            </span>
          </button>
        </div>
      </div>

      {/* Workshop Intro Title */}
      <div className="mt-4 rounded-3xl border border-[#ECE5D8] bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-bold text-[#059669]">
              Nivel A1 Universitario · Telling the Time
            </span>
            <h1 className="font-display mt-1.5 text-xl font-extrabold text-[#1E293B] sm:text-2xl">
              Decir la hora en inglés: Reloj, Número, Letra, Escucha y Lectura
            </h1>
          </div>
          <span className="rounded-2xl bg-[#FAF7F2] px-3.5 py-2 text-xs font-extrabold text-[#1E293B]">
            {totalSolved} / {ALL_TIME_EXERCISES.length} completados
          </span>
        </div>
      </div>

      {/* Collapsible Interactive Clock Lab & Visual Reference Guide */}
      {showLabGuide && (
        <div className="mt-4 rounded-[28px] border border-[#10B981]/35 bg-white p-5 shadow-xs sm:p-6 animate-soft-pop">
          <div className="grid items-center gap-6 md:grid-cols-12">
            <div className="flex flex-col items-center md:col-span-5">
              <InteractiveAnalogClock
                hours={labHours}
                minutes={labMinutes}
                interactive
                showDidacticZones
                hideDigitalHint={false}
                onChange={(h, m) => {
                  setLabHours(h);
                  setLabMinutes(m);
                }}
              />
            </div>

            <div className="space-y-4 md:col-span-7">
              <div>
                <h2 className="font-display text-base font-extrabold text-[#1E293B] sm:text-lg">
                  Laboratorio interactivo de la hora en inglés
                </h2>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  Mueve las manecillas o toca un ejemplo rápido para ver y escuchar cómo cambia entre la forma tradicional y la forma digital.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "7:00 · o'clock", h: 7, m: 0 },
                  { label: '2:15 · quarter past', h: 2, m: 15 },
                  { label: '9:30 · half past', h: 9, m: 30 },
                  { label: '4:45 · quarter to', h: 4, m: 45 },
                  { label: '10:40 · twenty to', h: 10, m: 40 },
                  { label: '12:00 · noon/midnight', h: 12, m: 0 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setLabHours(preset.h);
                      setLabMinutes(preset.m);
                    }}
                    className="rounded-full border border-[#E6DEC8] bg-[#FAF7F2] px-3 py-1 text-[11px] font-bold text-[#1E293B] hover:border-[#059669] hover:bg-white"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Live Comparison Readouts */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    speakEnglish(timeToTraditionalEnglish(labHours, labMinutes))
                  }
                  className="flex items-center justify-between gap-2 rounded-2xl border border-[#10B981]/35 bg-[#ECFDF5] p-3 text-left transition hover:bg-[#D1FAE5]/60"
                >
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#059669]">
                      Forma tradicional (Past / To)
                    </span>
                    <p className="font-display mt-0.5 text-sm font-extrabold text-[#065F46]">
                      {timeToTraditionalEnglish(labHours, labMinutes)}
                    </p>
                  </div>
                  <Volume2 className="h-4 w-4 shrink-0 text-[#059669]" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    speakEnglish(timeToDigitalEnglish(labHours, labMinutes))
                  }
                  className="flex items-center justify-between gap-2 rounded-2xl border border-[#2563EB]/30 bg-[#EFF6FF] p-3 text-left transition hover:bg-[#DBEAFE]/60"
                >
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-[#2563EB]">
                      Forma digital hablada ({formatDigital(labHours, labMinutes)})
                    </span>
                    <p className="font-display mt-0.5 text-sm font-extrabold text-[#1E3A8A]">
                      {timeToDigitalEnglish(labHours, labMinutes)}
                    </p>
                  </div>
                  <Volume2 className="h-4 w-4 shrink-0 text-[#2563EB]" />
                </button>
              </div>

              {/* 4 Essential Rules */}
              <div className="grid gap-2 text-[11px] sm:grid-cols-2">
                <div className="rounded-xl bg-[#FAF7F2] p-2.5 text-[#334155]">
                  <strong>1. En punto (:00):</strong> usa <code>o&apos;clock</code> solo cuando no hay minutos.
                </div>
                <div className="rounded-xl bg-[#FAF7F2] p-2.5 text-[#065F46]">
                  <strong>2. Zona derecha (:01–:30):</strong> minutos +{' '}
                  <code>past</code> + hora actual (<code>half past</code> para :30).
                </div>
                <div className="rounded-xl bg-[#FAF7F2] p-2.5 text-[#991B1B]">
                  <strong>3. Zona izquierda (:31–:59):</strong> minutos faltantes +{' '}
                  <code>to</code> + <strong>hora siguiente</strong>.
                </div>
                <div className="rounded-xl bg-[#FAF7F2] p-2.5 text-[#334155]">
                  <strong>4. Mediodía y medianoche:</strong>{' '}
                  <code>noon</code> (12:00 PM) vs <code>midnight</code> (12:00 AM).
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary & Notes View */}
      {showSummary ? (
        <div className="mt-5 rounded-[30px] border border-[#ECE5D8] bg-white p-6 shadow-xs sm:p-8 animate-soft-pop">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#1E293B]">
                Resumen del taller y retroalimentación
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">
                Completados: {totalSolved} de {ALL_TIME_EXERCISES.length} ejercicios
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyReport}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1E293B] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0F172A]"
            >
              {copiedReport ? (
                <>
                  <Check className="h-4 w-4 text-[#34D399]" />
                  <span>¡Reporte copiado!</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-4 w-4" />
                  <span>Copiar reporte y notas</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {TIME_WORKSHOP_SECTIONS.map((sec) => {
              const solvedCount = sec.exercises.filter(
                (e) => store[e.id]?.solved
              ).length;
              const notesCount = sec.exercises.filter((e) =>
                Boolean(store[e.id]?.feedbackNote?.trim())
              ).length;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => goToExercise(sec.id, 0)}
                  className="flex items-center justify-between rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2]/70 p-4 text-left transition hover:border-[#059669]/45 hover:bg-white"
                >
                  <div>
                    <span className="inline-block rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-[#059669]">
                      {sec.skillFocusEs}
                    </span>
                    <h3 className="font-display mt-1 text-sm font-extrabold text-[#1E293B]">
                      {sec.titleEs}
                    </h3>
                    {notesCount > 0 && (
                      <p className="mt-0.5 text-[11px] font-semibold text-[#D97706]">
                        {notesCount}{' '}
                        {notesCount === 1
                          ? 'nota de retroalimentación'
                          : 'notas de retroalimentación'}
                      </p>
                    )}
                  </div>
                  <span className="rounded-xl bg-white px-3 py-1 text-xs font-extrabold text-[#059669]">
                    {solvedCount}/{sec.exercises.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Section Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {TIME_WORKSHOP_SECTIONS.map((sec) => {
              const active = sec.id === currentSection.id;
              const done = sec.exercises.filter((e) => store[e.id]?.solved).length;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => goToExercise(sec.id, 0)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition ${
                    active
                      ? 'border-[#1E293B] bg-[#1E293B] text-white shadow-xs'
                      : 'border-[#ECE5D8] bg-white text-[#475569] hover:border-[#CBD5E1] hover:text-[#1E293B]'
                  }`}
                >
                  <span>
                    {sec.numberLabel}. {sec.skillFocusEs}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[#FAF7F2] text-[#64748B]'
                    }`}
                  >
                    {done}/{sec.exercises.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Numbered Stepper Pills */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#ECE5D8] bg-white p-3.5">
            <p className="text-xs font-extrabold text-[#1E293B]">
              {currentSection.titleEs}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {exercises.map((item, idx) => {
                const st = store[item.id];
                const active = idx === exerciseIdx;
                const solved = Boolean(st?.solved);
                const hasNote = Boolean(st?.feedbackNote?.trim());
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goToExercise(currentSection.id, idx)}
                    aria-label={`Ir al punto ${item.number}`}
                    className={`relative flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-extrabold transition ${
                      active
                        ? 'border-[#059669] bg-[#059669] text-white shadow-xs'
                        : solved
                          ? 'border-[#10B981]/50 bg-[#ECFDF5] text-[#059669]'
                          : 'border-[#E6DEC8] bg-[#FAF7F2] text-[#475569] hover:bg-white'
                    }`}
                  >
                    {item.number}
                    {hasNote && !active && (
                      <span
                        className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#F59E0B]"
                        title="Tiene nota de retroalimentación"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guided Tutor Bubble (with silent 30s/60s/90s progressive hints, ZERO elapsed time shown) */}
          <div className="mt-4">
            <TutorBubble
              message={tutorMessage}
              mood={tutorMood}
              isSpeaking={isSpeaking}
              clueLabel={activeClue}
            />
          </div>

          {/* Active Exercise Workspace Card */}
          <div className="mt-4 rounded-[30px] border border-[#ECE5D8] bg-white p-5 shadow-xs sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-extrabold text-[#059669]">
                  {exercise.skillTag} · Punto {exercise.number} de {exercises.length}
                </span>
                <span className="rounded-full bg-[#FAF7F2] px-3 py-1 text-xs font-bold text-[#64748B]">
                  {exercise.contextBadgeEs}
                </span>
              </div>

              {!isSolved && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleManualHint}
                    disabled={hintLevel >= 3}
                    className="inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/45 bg-[#FFFBEB] px-3 py-1 text-xs font-bold text-[#92400E] transition hover:bg-[#FEF3C7] disabled:opacity-50"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>
                      {hintLevel > 0 ? `Pista (${hintLevel}/3)` : 'Pedir pista'}
                    </span>
                  </button>

                  {(exState.attempts ?? 0) >= 2 && (
                    <button
                      type="button"
                      onClick={handleRevealGuided}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E6DEC8] bg-[#FAF7F2] px-3 py-1 text-xs font-bold text-[#475569] hover:text-[#1E293B]"
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-[#D97706]" />
                      <span>Ver solución guiada</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <h2 className="font-display mt-3.5 text-lg font-extrabold leading-snug text-[#1E293B] sm:text-xl">
              {exercise.promptEs}
            </h2>

            {/* Progressive Hints Stack */}
            {hintLevel > 0 && !isSolved && (
              <div className="mt-3 space-y-1.5 rounded-2xl border border-[#F59E0B]/40 bg-[#FFFBEB]/85 p-3.5">
                {exercise.progressiveHints
                  .slice(0, hintLevel)
                  .map((hint, idx) => (
                    <div key={hint} className="flex items-start gap-2 text-xs text-[#78350F]">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-[10px] font-extrabold text-white">
                        {idx + 1}
                      </span>
                      <span className="font-medium leading-relaxed">{hint}</span>
                    </div>
                  ))}
              </div>
            )}

            {/* Audio Prompt Card (when exercise includes audioText) */}
            {exercise.audioText && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2563EB]/25 bg-[#EFF6FF]/65 p-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      registerActivity();
                      speakEnglish(exercise.audioText!, false);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#1D4ED8] sm:text-sm"
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>Escuchar audio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      registerActivity();
                      speakEnglish(exercise.audioText!, true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#2563EB]/30 bg-white px-3.5 py-2.5 text-xs font-bold text-[#2563EB] transition hover:bg-[#EFF6FF]"
                  >
                    <span>Más despacio</span>
                  </button>
                </div>

                {isSolved && (
                  <p className="w-full text-xs font-semibold text-[#1E3A8A]">
                    Audio: &ldquo;{exercise.audioText}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Reading Card (Block 4) */}
            {exercise.readingCard && (
              <div className="mt-4 rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4 sm:p-5">
                <div className="flex items-center gap-2.5 border-b border-[#E6DEC8] pb-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-2xs">
                    <ReadingIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-extrabold text-[#1E293B]">
                      {exercise.readingCard.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-[#64748B]">
                      {exercise.readingCard.subtitle}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {exercise.readingCard.lines.map((line) => (
                    <p
                      key={line}
                      className="text-sm font-semibold leading-relaxed text-[#1E293B]"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt Static Clock + Digital Display (Block 3 Write-Words) */}
            {exercise.showClockInPrompt && (
              <div className="mt-5 flex flex-col items-center rounded-3xl border border-[#ECE5D8] bg-[#FAF7F2]/65 p-5">
                <InteractiveAnalogClock
                  hours={exercise.targetHours}
                  minutes={exercise.targetMinutes}
                  interactive={false}
                  showDidacticZones={hintLevel >= 2}
                  hideDigitalHint={!exercise.showDigitalInPrompt}
                  size="sm"
                />
                {exercise.showDigitalInPrompt && (
                  <p className="mt-2 text-xs font-bold text-[#64748B]">
                    Hora mostrada: {formatDigital(exercise.targetHours, exercise.targetMinutes)}
                  </p>
                )}
              </div>
            )}

            {/* Interactive Controls Container */}
            <div className="mt-5 space-y-5">
              {/* Interactive Analog Clock */}
              {isClockInteractive && (
                <div className="flex flex-col items-center rounded-3xl border border-[#ECE5D8] bg-[#FAF7F2]/55 p-5">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#475569]">
                    1. Pon las manecillas en el reloj analógico
                  </p>
                  <InteractiveAnalogClock
                    hours={isSolved ? exercise.targetHours : clockH}
                    minutes={isSolved ? exercise.targetMinutes : clockM}
                    interactive
                    disabled={isSolved}
                    showDidacticZones={hintLevel >= 2 || isSolved}
                    hideDigitalHint={!isSolved}
                    onChange={(nextH, nextM) => {
                      registerActivity();
                      updateExerciseState(exercise.id, (prev) => ({
                        ...prev,
                        clockHours: nextH,
                        clockMinutes: nextM,
                      }));
                    }}
                  />
                </div>
              )}

              {/* Interactive Digital Input */}
              {isDigitalInteractive && (
                <div>
                  {exercise.kind === 'triple-challenge' && (
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#475569]">
                      2. Escribe la hora en número digital y elige AM / PM
                    </p>
                  )}
                  <DigitalTimeInput
                    hours={isSolved ? exercise.targetHours : digH}
                    minutes={isSolved ? exercise.targetMinutes : digM}
                    period={
                      isSolved
                        ? exercise.targetPeriod ?? digPeriod
                        : digPeriod
                    }
                    showPeriod={Boolean(exercise.targetPeriod)}
                    disabled={isSolved}
                    onChange={(nextH, nextM, nextP) => {
                      registerActivity();
                      updateExerciseState(exercise.id, (prev) => ({
                        ...prev,
                        digitalHours: nextH,
                        digitalMinutes: nextM,
                        digitalPeriod: nextP,
                      }));
                    }}
                  />
                </div>
              )}

              {/* Written English Words Input */}
              {isWordsInteractive && (
                <div className="space-y-3">
                  {exercise.kind === 'triple-challenge' && (
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#475569]">
                      3. Escribe la hora completa en letra en inglés
                    </p>
                  )}
                  <input
                    type="text"
                    value={exState.textInput ?? ''}
                    disabled={isSolved}
                    onChange={(e) => {
                      registerActivity();
                      const val = e.target.value;
                      updateExerciseState(exercise.id, (prev) => ({
                        ...prev,
                        textInput: val,
                      }));
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        exercise.kind !== 'triple-challenge'
                      ) {
                        e.preventDefault();
                        handleCheckActiveExercise();
                      }
                    }}
                    placeholder="Escribe en inglés (ej. It's a quarter to nine.)"
                    aria-label="Escribir la hora en inglés"
                    className="w-full rounded-2xl border-2 border-[#E6DEC8] bg-[#FAF7F2] px-4 py-3 text-sm font-bold text-[#1E293B] placeholder:font-normal placeholder:text-[#94A3B8] focus:border-[#059669] focus:bg-white focus:outline-none disabled:border-[#10B981]/50 disabled:bg-[#ECFDF5]"
                  />

                  {hintLevel >= 3 && !isSolved && exercise.scaffoldChips && (
                    <div className="rounded-2xl border border-[#E6DEC8] bg-[#FAF7F2]/75 p-3.5">
                      <p className="mb-2 text-[11px] font-bold text-[#64748B]">
                        Fichas de apoyo (tócalas en orden para construir la frase):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {exercise.scaffoldChips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              registerActivity();
                              updateExerciseState(exercise.id, (prev) => {
                                const curr = (prev.textInput ?? '').trim();
                                return {
                                  ...prev,
                                  textInput: curr ? `${curr} ${chip}` : chip,
                                };
                              });
                            }}
                            className="rounded-xl border border-[#DCD3C0] bg-white px-3 py-1.5 text-xs font-bold text-[#1E293B] hover:border-[#059669]"
                          >
                            + {chip}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            registerActivity();
                            updateExerciseState(exercise.id, (prev) => ({
                              ...prev,
                              textInput: '',
                            }));
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-[#E6DEC8] px-2.5 py-1.5 text-[11px] font-bold text-[#64748B]"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Limpiar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reading Multiple Choice */}
              {exercise.kind === 'reading-choice' && exercise.choiceOptions && (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {exercise.choiceOptions.map((opt, optIdx) => {
                    const selected = exState.selectedChoice === optIdx;
                    const isRight = optIdx === exercise.correctChoiceIndex;
                    let cls =
                      'border-[#ECE5D8] bg-[#FAF7F2]/65 text-[#1E293B] hover:border-[#059669] hover:bg-white';
                    if (isSolved && isRight) {
                      cls = 'border-[#059669] bg-[#ECFDF5] text-[#065F46]';
                    } else if (selected && !isRight) {
                      cls = 'border-[#F59E0B] bg-[#FFFBEB] text-[#92400E]';
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={isSolved}
                        onClick={() => {
                          registerActivity();
                          updateExerciseState(exercise.id, (prev) => ({
                            ...prev,
                            selectedChoice: optIdx,
                          }));
                          if (optIdx === exercise.correctChoiceIndex) {
                            celebrateSuccess(exercise, { selectedChoice: optIdx });
                          } else {
                            coachWrongAttempt(
                              exercise,
                              'Fíjate bien si menciona AM o PM en cada parte del aviso ("midnight" y "in the morning").',
                              { selectedChoice: optIdx }
                            );
                          }
                        }}
                        className={`rounded-2xl border-2 p-3.5 text-left text-xs font-bold leading-snug transition sm:text-sm ${cls}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Submit Button (for non-instant choice types) */}
              {!isSolved && exercise.kind !== 'reading-choice' && (
                <button
                  type="button"
                  onClick={handleCheckActiveExercise}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#059669] px-6 py-3 text-sm font-extrabold text-white shadow-xs transition hover:bg-[#047857] active:translate-y-[1px]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {exercise.kind === 'triple-challenge'
                      ? 'Comprobar mis 3 respuestas'
                      : 'Comprobar respuesta'}
                  </span>
                </button>
              )}
            </div>

            {/* === DEDICATED FEEDBACK SPACE ON EVERY EXERCISE === */}
            <div className="mt-7 rounded-3xl border border-[#ECE5D8] bg-[#FAF7F2]/85 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#059669]" />
                  <h3 className="font-display text-sm font-extrabold text-[#1E293B]">
                    Espacio de retroalimentación del ejercicio
                  </h3>
                </div>

                {isSolved && (
                  <button
                    type="button"
                    onClick={() => speakEnglish(exercise.spokenModelEn)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#059669] shadow-2xs transition hover:bg-[#ECFDF5]"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Escuchar pronunciación</span>
                  </button>
                )}
              </div>

              {(isSolved || exState.revealed) && (
                <div className="mt-3 rounded-2xl border border-[#10B981]/35 bg-[#ECFDF5] p-3.5">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[#059669]">
                    Retroalimentación pedagógica
                  </p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-[#065F46] sm:text-sm">
                    {exercise.feedbackEs}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold text-[#047857]">
                    Error típico a evitar: {exercise.commonTrapEs}
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className="rounded-xl bg-white px-2.5 py-1 text-xs font-extrabold text-[#1E293B]">
                      Número:{' '}
                      {formatDigital(exercise.targetHours, exercise.targetMinutes)}
                      {exercise.targetPeriod ? ` ${exercise.targetPeriod}` : ''}
                    </span>
                    <span className="rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-[#059669]">
                      Tradicional: {exercise.displayPhrase}
                    </span>
                    <span className="rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-[#2563EB]">
                      Digital: {exercise.digitalEnglishPhrase}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-[#64748B]">
                    ¿Qué tal te pareció este punto?
                  </span>
                  {(
                    [
                      { id: 'clear', label: 'Lo entendí claro' },
                      { id: 'medium', label: 'Me costó un poco' },
                      { id: 'doubt', label: 'Tengo duda' },
                    ] as const
                  ).map((opt) => {
                    const active = exState.confidence === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          registerActivity();
                          updateExerciseState(exercise.id, (prev) => ({
                            ...prev,
                            confidence: opt.id,
                          }));
                        }}
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                          active
                            ? 'border-[#1E293B] bg-[#1E293B] text-white'
                            : 'border-[#E6DEC8] bg-white text-[#475569] hover:border-[#CBD5E1]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  rows={2}
                  value={exState.feedbackNote ?? ''}
                  onChange={(e) => {
                    registerActivity();
                    const val = e.target.value;
                    updateExerciseState(exercise.id, (prev) => ({
                      ...prev,
                      feedbackNote: val,
                    }));
                  }}
                  placeholder="Espacio de retroalimentación: escribe qué clave recordaste, una duda puntual o comentario para revisar..."
                  aria-label="Espacio de retroalimentación del ejercicio"
                  className="w-full rounded-2xl border border-[#DCD3C0] bg-white p-3 text-xs leading-relaxed text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#059669] focus:outline-none sm:text-sm"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleAskFeedbackTutor}
                    disabled={tutorLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#059669]/30 bg-white px-3.5 py-2 text-xs font-bold text-[#059669] transition hover:bg-[#ECFDF5] disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <Send className="h-3 w-3" />
                    <span>
                      {tutorLoading
                        ? 'Preparando retroalimentación...'
                        : 'Pedir retroalimentación guiada'}
                    </span>
                  </button>

                  {hintLevel > 0 && !isSolved && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#92400E]">
                      <PointingHandCue className="h-5 w-5" />
                      Orientación activa ({hintLevel}/3)
                    </span>
                  )}
                </div>

                {exState.aiTutorReply && (
                  <div className="rounded-2xl border border-[#A7F3D0] bg-white p-3 text-xs leading-relaxed text-[#1E293B]">
                    <strong className="text-[#059669]">
                      Retroalimentación guiada:{' '}
                    </strong>
                    {exState.aiTutorReply}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Step Navigation */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1ECE2] pt-4">
              <button
                type="button"
                disabled={
                  exerciseIdx === 0 &&
                  TIME_WORKSHOP_SECTIONS[0].id === currentSection.id
                }
                onClick={movePrev}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-[#E6DEC8] bg-white px-4 py-2.5 text-xs font-bold text-[#475569] transition hover:text-[#1E293B] disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Anterior</span>
              </button>

              <button
                type="button"
                onClick={moveNext}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#1E293B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0F172A] sm:text-sm"
              >
                <span>
                  {exerciseIdx + 1 < exercises.length
                    ? 'Siguiente ejercicio'
                    : 'Siguiente bloque / Resumen'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
