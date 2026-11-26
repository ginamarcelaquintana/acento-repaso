'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  HelpCircle,
  Layers,
  Lightbulb,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type {
  ParticipeExercise,
  ParticipeFamilyKey,
  ParticipeSection,
} from '@/types/participe-workshop';
import {
  CLASS_ACTIVITY_25_VERBS,
  FAMILY_BADGES,
  PARTICIPE_RULES,
  PARTICIPE_SECTIONS,
  PDF_REFERENCE_VERBS,
  TOTAL_PARTICIPE_EXERCISES,
} from '@/data/participe-passe-workshop';
import { PRAISE_FR, PhraseDeck } from '@/data/tutor-phrases';
import {
  FRENCH_ACCENT_KEYS,
  diagnoseFrenchParticipleMistake,
  matchesFrenchParticiple,
} from '@/lib/participe-utils';
import { voiceEngine } from '@/lib/voice-engine';
import { PointingHandCue } from './EditorialIllustrations';
import { TutorBubble, type TutorMood } from './TutorBubble';

const PARTICIPE_STORAGE_KEY = 'accento_participe_workshop_v1';

type ConfidenceRating = 'clear' | 'medium' | 'doubt';
type GuideTab = 'rules' | 'verbs' | 'activity';

interface ParticipeExerciseState {
  solved?: boolean;
  revealed?: boolean;
  attempts?: number;
  hintLevel?: 0 | 1 | 2 | 3;
  selectedOption?: string;
  textInput?: string;
  confidence?: ConfidenceRating;
  feedbackNote?: string;
  aiTutorReply?: string;
}

type ParticipeWorkshopStore = Record<string, ParticipeExerciseState>;

interface ParticipePasseWorkshopProps {
  voiceMuted?: boolean;
  onBack: () => void;
}

function loadParticipeStore(): ParticipeWorkshopStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PARTICIPE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object'
      ? (parsed as ParticipeWorkshopStore)
      : {};
  } catch {
    return {};
  }
}

function saveParticipeStore(store: ParticipeWorkshopStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PARTICIPE_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

export function ParticipePasseWorkshop({
  voiceMuted = false,
  onBack,
}: ParticipePasseWorkshopProps) {
  const [sectionId, setSectionId] = useState<string>(PARTICIPE_SECTIONS[0].id);
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  // Collapsible PDF reference drawer
  const [showPdfGuide, setShowPdfGuide] = useState(false);
  const [guideTab, setGuideTab] = useState<GuideTab>('rules');
  const [familyFilter, setFamilyFilter] = useState<ParticipeFamilyKey | 'all'>('all');
  const [verbQuery, setVerbQuery] = useState('');
  const [showAllActivityAnswers, setShowAllActivityAnswers] = useState(false);
  const [revealedActivityNums, setRevealedActivityNums] = useState<number[]>([]);

  const [store, setStore] = useState<ParticipeWorkshopStore>({});
  const [hydrated, setHydrated] = useState(false);

  const [tutorMessage, setTutorMessage] = useState(
    'Analiza el infinitivo o escucha la frase en francés con calma. Si dudas, usa una pista paso a paso o abre la guía del PDF.'
  );
  const [tutorMood, setTutorMood] = useState<TutorMood>('neutral');
  const [activeClue, setActiveClue] = useState<string | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [doubtDraft, setDoubtDraft] = useState('');
  const [tutorLoading, setTutorLoading] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Silent inactivity tracker — never exposed or shown anywhere in the UI
  const lastActivityRef = useRef<number>(0);
  const praiseDeckRef = useRef(new PhraseDeck(PRAISE_FR));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setStore(loadParticipeStore());
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
      saveParticipeStore(store);
    }
  }, [store, hydrated]);

  const currentSection: ParticipeSection = useMemo(
    () =>
      PARTICIPE_SECTIONS.find((s) => s.id === sectionId) ??
      PARTICIPE_SECTIONS[0],
    [sectionId]
  );

  const exercises = currentSection.exercises;
  const exercise: ParticipeExercise | undefined =
    exercises[exerciseIdx] ?? exercises[0];

  const exState: ParticipeExerciseState = useMemo(
    () => (exercise ? store[exercise.id] ?? {} : {}),
    [store, exercise]
  );

  const isSolved = Boolean(exState.solved);
  const hintLevel: 0 | 1 | 2 | 3 = exState.hintLevel ?? 0;

  const updateExerciseState = useCallback(
    (
      exId: string,
      updater: (prev: ParticipeExerciseState) => ParticipeExerciseState
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

  const speakFrench = useCallback((phrase: string, slow = false) => {
    voiceEngine.speak({
      text: phrase,
      mode: 'fr',
      targetLang: 'fr',
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
          targetLang: 'fr',
          muted: false,
          onStart: () => setIsSpeaking(true),
          onEnd: () => setIsSpeaking(false),
        });
      }
    },
    [voiceMuted]
  );

  // Silent progressive coaching after inactivity without showing any timer or elapsed indicator
  useEffect(() => {
    if (!hydrated || !exercise || isSolved || showSummary) return;

    const intervalId = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);

      if (elapsed >= 90 && hintLevel < 3) {
        const clue = exercise.progressiveHints[2];
        updateExerciseState(exercise.id, (prev) => ({ ...prev, hintLevel: 3 }));
        speakCoach(
          'Vamos a resolverlo juntos con esta guía directa sin regalarte la palabra:',
          'coaching',
          clue
        );
      } else if (elapsed >= 60 && hintLevel < 2) {
        const clue = exercise.progressiveHints[1];
        updateExerciseState(exercise.id, (prev) => ({ ...prev, hintLevel: 2 }));
        speakCoach(
          'Fíjate en esta segunda pista de apoyo para identificar la terminación:',
          'coaching',
          clue
        );
      } else if (elapsed >= 30 && hintLevel < 1) {
        const clue = exercise.progressiveHints[0];
        updateExerciseState(exercise.id, (prev) => ({ ...prev, hintLevel: 1 }));
        speakCoach(
          'Tómate tu ritmo con tranquilidad. Aquí tienes una primera pista:',
          'coaching',
          clue
        );
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [
    hydrated,
    exercise,
    isSolved,
    showSummary,
    hintLevel,
    updateExerciseState,
    speakCoach,
  ]);

  const navigateToExercise = useCallback(
    (nextSectionId: string, nextIdx: number) => {
      voiceEngine.stop();
      lastActivityRef.current = Date.now();
      setSectionId(nextSectionId);
      setExerciseIdx(nextIdx);
      setShowSummary(false);
      setDoubtDraft('');
      setTutorMood('neutral');
      setActiveClue(undefined);
      setTutorMessage(
        'Analiza el infinitivo o escucha la frase en francés con calma. Si dudas, pide una pista paso a paso.'
      );
    },
    []
  );

  const handleRequestHint = () => {
    if (!exercise) return;
    registerActivity();
    const nextLevel = Math.min(3, hintLevel + 1) as 1 | 2 | 3;
    const clue = exercise.progressiveHints[nextLevel - 1];
    updateExerciseState(exercise.id, (prev) => ({
      ...prev,
      hintLevel: nextLevel,
    }));
    speakCoach(
      nextLevel === 1
        ? 'Aquí tienes una primera orientación sobre la familia del verbo:'
        : nextLevel === 2
        ? 'Segunda pista para afinar la escritura o consonante final:'
        : 'Último empujón guiado para que armes la forma correcta:',
      'coaching',
      clue
    );
  };

  const handleCheckAnswer = () => {
    if (!exercise) return;
    registerActivity();

    const isChoiceMode =
      exercise.kind === 'classify-family' ||
      exercise.kind === 'spot-correct' ||
      exercise.kind === 'listen-identify';

    const rawAnswer = isChoiceMode
      ? exState.selectedOption ?? ''
      : exState.textInput ?? '';

    const isCorrect = matchesFrenchParticiple(
      rawAnswer,
      exercise.acceptedAnswers,
      isChoiceMode
    );

    if (isCorrect) {
      updateExerciseState(exercise.id, (prev) => ({
        ...prev,
        solved: true,
        revealed: false,
        attempts: (prev.attempts ?? 0) + 1,
      }));
      const praise = praiseDeckRef.current.next();
      speakCoach(
        `${praise} ${exercise.feedbackEs}`,
        'celebration',
        exercise.spokenFrench
      );
    } else {
      const nextHint = Math.min(3, Math.max(1, hintLevel + 1)) as 1 | 2 | 3;
      const diagnostic = diagnoseFrenchParticipleMistake(rawAnswer, exercise);
      updateExerciseState(exercise.id, (prev) => ({
        ...prev,
        attempts: (prev.attempts ?? 0) + 1,
        hintLevel: nextHint,
      }));
      speakCoach(diagnostic, 'coaching', exercise.progressiveHints[nextHint - 1]);
    }
  };

  const handleRevealSolution = () => {
    if (!exercise) return;
    registerActivity();
    updateExerciseState(exercise.id, (prev) => ({
      ...prev,
      solved: true,
      revealed: true,
      hintLevel: 3,
      selectedOption:
        exercise.options && exercise.options.length > 0
          ? exercise.correctAnswer
          : prev.selectedOption,
      textInput:
        !exercise.options || exercise.options.length === 0
          ? exercise.correctAnswer
          : prev.textInput,
    }));
    speakCoach(
      `Respuesta guía: ${exercise.correctAnswer}. ${exercise.feedbackEs}`,
      'neutral',
      exercise.spokenFrench
    );
  };

  const handleResetExercise = () => {
    if (!exercise) return;
    registerActivity();
    updateExerciseState(exercise.id, (prev) => ({
      confidence: prev.confidence,
      feedbackNote: prev.feedbackNote,
      aiTutorReply: prev.aiTutorReply,
    }));
    setTutorMood('neutral');
    setActiveClue(undefined);
    setTutorMessage(
      'Reiniciamos este punto. Inténtalo nuevamente desde cero con tranquilidad.'
    );
  };

  const handleInsertAccent = (accentChar: string) => {
    if (!exercise) return;
    registerActivity();
    const el = inputRef.current;
    const current = exState.textInput ?? '';
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      const nextVal = current.slice(0, start) + accentChar + current.slice(end);
      updateExerciseState(exercise.id, (prev) => ({
        ...prev,
        textInput: nextVal,
      }));
      window.requestAnimationFrame(() => {
        el.focus();
        const cursor = start + accentChar.length;
        el.setSelectionRange(cursor, cursor);
      });
    } else {
      updateExerciseState(exercise.id, (prev) => ({
        ...prev,
        textInput: current + accentChar,
      }));
      el?.focus();
    }
  };

  const handleAskTutor = async () => {
    if (!exercise) return;
    const cleanDoubt =
      doubtDraft.trim() ||
      `¿Por qué el participe passé de "${exercise.infinitive}" sigue esta regla en francés A1?`;
    registerActivity();
    setTutorLoading(true);
    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          topicSlug: 'fr-a1-participe-passe',
          topicTitle: 'Le Participe Passé (Francés A1)',
          language: 'fr',
          level: 'A1',
          questionPrompt: `${exercise.numberLabel} · Verbo "${exercise.infinitive}" (${exercise.translationEs}): ${exercise.promptEs}`,
          studentDoubt: cleanDoubt,
          currentHint: exercise.progressiveHints[Math.min(2, hintLevel)],
          currentExplanation: isSolved
            ? exercise.feedbackEs
            : exercise.progressiveHints[Math.min(2, hintLevel)],
        }),
      });
      const data = (await response.json()) as { reply?: string };
      const replyText =
        data.reply?.trim() ||
        exercise.progressiveHints[Math.min(2, hintLevel)];
      updateExerciseState(exercise.id, (prev) => ({
        ...prev,
        aiTutorReply: replyText,
      }));
      setDoubtDraft('');
      speakCoach(replyText, 'coaching');
    } catch {
      const fallback = exercise.progressiveHints[Math.min(2, hintLevel)];
      updateExerciseState(exercise.id, (prev) => ({
        ...prev,
        aiTutorReply: fallback,
      }));
    } finally {
      setTutorLoading(false);
    }
  };

  const filteredReferenceVerbs = useMemo(() => {
    const q = verbQuery.trim().toLowerCase();
    return PDF_REFERENCE_VERBS.filter((row) => {
      if (familyFilter !== 'all' && row.family !== familyFilter) return false;
      if (!q) return true;
      return (
        row.infinitive.toLowerCase().includes(q) ||
        row.participle.toLowerCase().includes(q) ||
        row.translationEs.toLowerCase().includes(q) ||
        row.endingLabel.toLowerCase().includes(q)
      );
    });
  }, [familyFilter, verbQuery]);

  const solvedCount = useMemo(
    () =>
      PARTICIPE_SECTIONS.reduce(
        (acc, sec) =>
          acc + sec.exercises.filter((ex) => store[ex.id]?.solved).length,
        0
      ),
    [store]
  );

  const solvedCleanCount = useMemo(
    () =>
      PARTICIPE_SECTIONS.reduce(
        (acc, sec) =>
          acc +
          sec.exercises.filter(
            (ex) => store[ex.id]?.solved && !store[ex.id]?.revealed
          ).length,
        0
      ),
    [store]
  );

  const goNextExercise = () => {
    if (exerciseIdx + 1 < exercises.length) {
      navigateToExercise(currentSection.id, exerciseIdx + 1);
      return;
    }
    const secIdx = PARTICIPE_SECTIONS.findIndex(
      (s) => s.id === currentSection.id
    );
    if (secIdx >= 0 && secIdx + 1 < PARTICIPE_SECTIONS.length) {
      navigateToExercise(PARTICIPE_SECTIONS[secIdx + 1].id, 0);
    } else {
      setShowSummary(true);
    }
  };

  const copySummaryReport = async () => {
    const lines: string[] = [
      'ACCENTO — Taller Guiado: Le Participe Passé (Francés A1)',
      `Ejercicios completados: ${solvedCount}/${TOTAL_PARTICIPE_EXERCISES} (${solvedCleanCount} resueltos sin ver solución)`,
      '',
    ];
    for (const sec of PARTICIPE_SECTIONS) {
      const doneInSec = sec.exercises.filter((ex) => store[ex.id]?.solved).length;
      lines.push(`${sec.badge}: ${doneInSec}/${sec.exercises.length}`);
      for (const ex of sec.exercises) {
        const st = store[ex.id];
        if (st?.confidence === 'doubt' || st?.feedbackNote) {
          lines.push(
            `  - ${ex.numberLabel} (${ex.infinitive} → ${ex.correctAnswer}): ${
              st.confidence === 'doubt' ? '[Tengo duda] ' : ''
            }${st.feedbackNote ?? ''}`
          );
        }
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedReport(true);
      window.setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      // Clipboard unsupported
    }
  };

  const isTypingBlock =
    exercise?.kind === 'context-fill' || exercise?.kind === 'family-deduction';

  const canCheck = useMemo(() => {
    if (!exercise) return false;
    if (isTypingBlock) {
      return Boolean((exState.textInput ?? '').trim());
    }
    return Boolean(exState.selectedOption);
  }, [exercise, isTypingBlock, exState.textInput, exState.selectedOption]);

  if (!exercise) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Top Workshop Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#ECE5D8] bg-white px-5 py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ECE5D8] bg-[#FBF9F5] px-3.5 py-2 text-xs font-bold text-[#1E293B] transition hover:border-[#2B4C7E]/40 hover:bg-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver</span>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-bold text-[#E63946]">
                <Layers className="h-3 w-3" />
                Francés A1 · Verbos en pasado
              </span>
              <span className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-bold text-[#2B4C7E]">
                Resueltos: {solvedCount} / {TOTAL_PARTICIPE_EXERCISES}
              </span>
            </div>
            <h1 className="mt-1 font-serif text-lg font-bold text-[#1E293B] sm:text-xl">
              Taller Guiado: Le Participe Passé por Familias
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              registerActivity();
              setShowPdfGuide((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition ${
              showPdfGuide
                ? 'border-[#2B4C7E] bg-[#2B4C7E] text-white'
                : 'border-[#2B4C7E]/30 bg-[#EFF6FF] text-[#2B4C7E] hover:bg-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Guía y listado del PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSummary((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition ${
              showSummary
                ? 'border-[#1E293B] bg-[#1E293B] text-white'
                : 'border-[#ECE5D8] bg-[#FBF9F5] text-[#1E293B] hover:border-[#1E293B]/35'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{showSummary ? 'Volver a ejercicios' : 'Resumen'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible PDF Guide Drawer */}
      {showPdfGuide && (
        <section className="mt-4 rounded-3xl border border-[#2B4C7E]/25 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1ECE2] pb-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#1E293B]">
                Material de apoyo · Listado de Participios Franceses
              </h2>
              <p className="text-xs text-[#64748B]">
                Reglas generales, los 73 verbos por familia y la Activité en classe de la página 4.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'rules', label: '3 Reglas clave' },
                  { id: 'verbs', label: 'Listado completo (73)' },
                  { id: 'activity', label: 'Activité en classe (25)' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    registerActivity();
                    setGuideTab(tab.id);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    guideTab === tab.id
                      ? 'bg-[#2B4C7E] text-white'
                      : 'border border-[#ECE5D8] bg-[#FBF9F5] text-[#475569] hover:border-[#2B4C7E]/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {guideTab === 'rules' && (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {PARTICIPE_RULES.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#ECE5D8] bg-[#FBF9F5] p-4"
                >
                  <div>
                    <span className="inline-block rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[11px] font-bold text-[#2B4C7E]">
                      {rule.badge}
                    </span>
                    <h3 className="mt-2 text-sm font-bold text-[#1E293B]">
                      {rule.title}
                    </h3>
                    <p className="mt-1.5 rounded-xl bg-white px-3 py-2 font-mono text-xs font-bold text-[#2B4C7E]">
                      {rule.formula}
                    </p>
                    {rule.warning && (
                      <p className="mt-2 text-xs font-medium text-[#B45309]">
                        {rule.warning}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#ECE5D8] pt-3">
                    <div>
                      <p className="text-sm font-bold text-[#1E293B]">
                        {rule.exampleFr}
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        {rule.exampleEs}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakFrench(rule.exampleFr)}
                      aria-label={`Escuchar ${rule.exampleFr}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#2B4C7E]/30 bg-white text-[#2B4C7E] transition hover:bg-[#EFF6FF]"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {guideTab === 'verbs' && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFamilyFilter('all')}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                      familyFilter === 'all'
                        ? 'bg-[#1E293B] text-white'
                        : 'border border-[#ECE5D8] bg-[#FBF9F5] text-[#475569]'
                    }`}
                  >
                    Todas (73)
                  </button>
                  {(Object.keys(FAMILY_BADGES) as ParticipeFamilyKey[]).map(
                    (fam) => (
                      <button
                        key={fam}
                        type="button"
                        onClick={() => setFamilyFilter(fam)}
                        className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                          familyFilter === fam
                            ? 'border-[#1E293B] bg-[#1E293B] text-white'
                            : 'border-[#ECE5D8] bg-[#FBF9F5] text-[#475569]'
                        }`}
                      >
                        {FAMILY_BADGES[fam].label}
                      </button>
                    )
                  )}
                </div>

                <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
                  <input
                    type="text"
                    value={verbQuery}
                    onChange={(e) => setVerbQuery(e.target.value)}
                    placeholder="Buscar verbo o significado..."
                    className="w-full rounded-full border border-[#ECE5D8] bg-[#FBF9F5] py-1.5 pr-3 pl-8 text-xs text-[#1E293B] outline-none focus:border-[#2B4C7E]"
                  />
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-2xl border border-[#ECE5D8]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#FBF9F5] text-[11px] font-bold text-[#475569]">
                    <tr className="border-b border-[#ECE5D8]">
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Infinitivo</th>
                      <th className="px-3 py-2">Participe Passé</th>
                      <th className="px-3 py-2">Terminación</th>
                      <th className="px-3 py-2">Español</th>
                      <th className="px-3 py-2 text-right">Audio FR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1ECE2]">
                    {filteredReferenceVerbs.map((row, idx) => (
                      <tr
                        key={`${row.pdfNumber}-${row.infinitive}-${idx}`}
                        className={
                          row.highlighted ? 'bg-[#FEF2F2]/70' : 'bg-white'
                        }
                      >
                        <td className="px-3 py-2 font-mono text-[#64748B]">
                          {row.pdfNumber}
                        </td>
                        <td className="px-3 py-2 font-semibold text-[#1E293B]">
                          {row.infinitive}
                        </td>
                        <td className="px-3 py-2 font-bold text-[#2B4C7E]">
                          {row.participle}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              FAMILY_BADGES[row.family].accentClass
                            }`}
                          >
                            {row.endingLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[#475569]">
                          {row.translationEs}
                          {row.note && (
                            <span className="block text-[10px] text-[#B45309]">
                              {row.note}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              speakFrench(
                                row.exampleFr ?? `${row.infinitive}, ${row.participle}`
                              )
                            }
                            aria-label={`Pronunciar ${row.participle}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ECE5D8] text-[#2B4C7E] transition hover:bg-[#EFF6FF]"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {guideTab === 'activity' && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[#475569]">
                  Los 25 verbos de la hoja <strong>Activité en classe</strong> (pág. 4). Haz clic en una tarjeta para comprobar tu respuesta.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAllActivityAnswers((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2B4C7E]/30 bg-[#EFF6FF] px-3 py-1.5 text-xs font-bold text-[#2B4C7E]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>
                    {showAllActivityAnswers
                      ? 'Ocultar respuestas'
                      : 'Mostrar todas las respuestas'}
                  </span>
                </button>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {CLASS_ACTIVITY_25_VERBS.map((item) => {
                  const isItemShown =
                    showAllActivityAnswers ||
                    revealedActivityNums.includes(item.number);
                  return (
                    <div
                      key={item.number}
                      className="flex flex-col justify-between rounded-2xl border border-[#ECE5D8] bg-[#FBF9F5] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-[#64748B]">
                            #{item.number}
                          </span>
                          <p className="text-sm font-bold text-[#1E293B]">
                            {item.infinitive}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            speakFrench(
                              isItemShown
                                ? `${item.infinitive}, ${item.participle}`
                                : item.infinitive
                            )
                          }
                          aria-label={`Escuchar ${item.infinitive}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ECE5D8] bg-white text-[#2B4C7E]"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setRevealedActivityNums((prev) =>
                            prev.includes(item.number)
                              ? prev.filter((n) => n !== item.number)
                              : [...prev, item.number]
                          )
                        }
                        className={`mt-2 w-full rounded-xl px-2.5 py-1.5 text-left text-xs font-bold transition ${
                          isItemShown
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : 'border border-dashed border-[#CBD5E1] bg-white text-[#64748B] hover:border-[#2B4C7E]'
                        }`}
                      >
                        {isItemShown ? (
                          <span>→ {item.participle}</span>
                        ) : (
                          <span>Tocar para ver</span>
                        )}
                      </button>
                      <p className="mt-1 text-[10px] text-[#64748B]">
                        {item.hintEs}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Summary View */}
      {showSummary ? (
        <section className="mt-5 rounded-3xl border border-[#ECE5D8] bg-white p-6 shadow-xs sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F1ECE2] pb-5">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#059669]">
                <Sparkles className="h-3.5 w-3.5" />
                Progreso del taller
              </span>
              <h2 className="mt-2 font-serif text-2xl font-bold text-[#1E293B]">
                Resumen · Participe Passé ({solvedCount}/{TOTAL_PARTICIPE_EXERCISES})
              </h2>
              <p className="mt-1 text-sm text-[#475569]">
                Resueltos de forma autónoma sin ver solución:{' '}
                <strong>{solvedCleanCount}</strong> de {TOTAL_PARTICIPE_EXERCISES}.
              </p>
            </div>

            <button
              type="button"
              onClick={copySummaryReport}
              className="inline-flex items-center gap-2 rounded-full bg-[#2B4C7E] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1E3A63]"
            >
              {copiedReport ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>¡Resumen copiado!</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-4 w-4" />
                  <span>Copiar resumen de práctica</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PARTICIPE_SECTIONS.map((sec) => {
              const secSolved = sec.exercises.filter(
                (ex) => store[ex.id]?.solved
              ).length;
              return (
                <div
                  key={sec.id}
                  className="rounded-2xl border border-[#ECE5D8] bg-[#FBF9F5] p-4"
                >
                  <p className="text-xs font-bold text-[#2B4C7E]">{sec.badge}</p>
                  <p className="mt-1 font-serif text-lg font-bold text-[#1E293B]">
                    {secSolved} / {sec.exercises.length} resueltos
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sec.exercises.map((ex, i) => {
                      const st = store[ex.id];
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => navigateToExercise(sec.id, i)}
                          className={`rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                            st?.solved && !st?.revealed
                              ? 'bg-[#ECFDF5] text-[#047857]'
                              : st?.solved
                              ? 'bg-[#FFF5E9] text-[#B45309]'
                              : 'border border-[#ECE5D8] bg-white text-[#475569]'
                          }`}
                        >
                          {ex.numberLabel} · {ex.infinitive}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          {/* 5-Block Switcher Tabs */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PARTICIPE_SECTIONS.map((sec, idx) => {
              const doneInSec = sec.exercises.filter(
                (ex) => store[ex.id]?.solved
              ).length;
              const active = sec.id === currentSection.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => navigateToExercise(sec.id, 0)}
                  className={`flex flex-col items-start rounded-2xl border px-3.5 py-2.5 text-left transition ${
                    active
                      ? 'border-[#2B4C7E] bg-[#2B4C7E] text-white shadow-xs'
                      : 'border-[#ECE5D8] bg-white text-[#1E293B] hover:border-[#2B4C7E]/40'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold ${
                      active ? 'text-[#BFDBFE]' : 'text-[#64748B]'
                    }`}
                  >
                    Tipo {idx + 1} · {doneInSec}/{sec.exercises.length}
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-xs font-bold">
                    {sec.badge.replace(/^Bloque \d+ · /, '')}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Exercise Card */}
          <main className="mt-4 rounded-3xl border border-[#ECE5D8] bg-white p-5 shadow-xs sm:p-7">
            {/* Section Title & Exercise Number Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1ECE2] pb-4">
              <div>
                <p className="text-xs font-bold text-[#E63946]">
                  {currentSection.badge}
                </p>
                <h2 className="mt-0.5 font-serif text-xl font-bold text-[#1E293B]">
                  {currentSection.title}
                </h2>
                <p className="text-xs text-[#64748B]">
                  {currentSection.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {exercises.map((item, idx) => {
                  const st = store[item.id];
                  const isCurr = idx === exerciseIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateToExercise(currentSection.id, idx)}
                      className={`inline-flex h-8 min-w-[2.4rem] items-center justify-center rounded-xl border px-2 text-xs font-bold transition ${
                        isCurr
                          ? 'border-[#E63946] bg-[#FEF2F2] text-[#E63946]'
                          : st?.solved
                          ? 'border-[#10B981]/40 bg-[#ECFDF5] text-[#047857]'
                          : 'border-[#ECE5D8] bg-[#FBF9F5] text-[#475569] hover:border-[#2B4C7E]/40'
                      }`}
                    >
                      {st?.solved && !isCurr ? (
                        <Check className="mr-0.5 h-3 w-3" />
                      ) : null}
                      {item.numberLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coaching Bubble + Utility Controls */}
            <div className="mt-5 space-y-3">
              <TutorBubble
                message={tutorMessage}
                mood={tutorMood}
                isSpeaking={isSpeaking}
                clueLabel={activeClue}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequestHint}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#F59E0B]/40 bg-[#FFFBEB] px-3.5 py-1.5 text-xs font-bold text-[#B45309] transition hover:bg-[#FEF3C7]"
                  >
                    <Lightbulb className="h-3.5 w-3.5" />
                    <span>
                      {hintLevel === 0
                        ? 'Pedir pista'
                        : hintLevel < 3
                        ? `Otra pista (${hintLevel}/3)`
                        : 'Última pista'}
                    </span>
                  </button>

                  {exercise.kind !== 'listen-identify' && (
                    <button
                      type="button"
                      onClick={() =>
                        speakFrench(
                          isSolved
                            ? exercise.spokenFrench
                            : exercise.infinitive
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#2B4C7E]/30 bg-[#EFF6FF] px-3.5 py-1.5 text-xs font-bold text-[#2B4C7E] transition hover:bg-white"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>
                        {isSolved
                          ? 'Escuchar frase completa'
                          : 'Escuchar infinitivo'}
                      </span>
                    </button>
                  )}

                  {(hintLevel >= 2 || (exState.attempts ?? 0) >= 2) &&
                    !isSolved && (
                      <button
                        type="button"
                        onClick={handleRevealSolution}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#CBD5E1] bg-white px-3.5 py-1.5 text-xs font-bold text-[#475569] transition hover:border-[#1E293B]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ver solución guiada</span>
                      </button>
                    )}
                </div>

                <button
                  type="button"
                  onClick={handleResetExercise}
                  className="inline-flex items-center gap-1 rounded-full border border-[#ECE5D8] bg-[#FBF9F5] px-3 py-1.5 text-xs font-bold text-[#64748B] transition hover:text-[#1E293B]"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reiniciar</span>
                </button>
              </div>
            </div>

            {/* Exercise Prompt & Interactive Mechanic */}
            <div className="mt-5 rounded-3xl border border-[#ECE5D8] bg-[#FBF9F5] p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#1E293B] shadow-2xs">
                  Punto {exercise.numberLabel}
                </span>

                {exercise.kind !== 'listen-identify' ? (
                  <span className="rounded-full border border-[#ECE5D8] bg-white px-3 py-1 text-xs font-medium text-[#475569]">
                    Infinitivo:{' '}
                    <strong className="text-[#2B4C7E]">
                      {exercise.infinitive}
                    </strong>{' '}
                    ({exercise.translationEs})
                  </span>
                ) : (
                  <span className="rounded-full border border-[#ECE5D8] bg-white px-3 py-1 text-xs font-medium text-[#475569]">
                    Significado: <strong>{exercise.translationEs}</strong>
                  </span>
                )}
              </div>

              <p className="mt-3 text-base font-bold text-[#1E293B]">
                {exercise.promptEs}
              </p>

              {/* BLOCK 3 AUDIO STAGE */}
              {exercise.kind === 'listen-identify' && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#2B4C7E]/25 bg-white p-4">
                  <button
                    type="button"
                    onClick={() => {
                      registerActivity();
                      speakFrench(exercise.spokenFrench, false);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2B4C7E] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1E3A63]"
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>Escuchar frase (normal)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      registerActivity();
                      speakFrench(exercise.spokenFrench, true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[#2B4C7E]/30 bg-[#EFF6FF] px-4 py-2 text-xs font-bold text-[#2B4C7E] transition hover:bg-white"
                  >
                    <Volume2 className="h-4 w-4" />
                    <span>Escuchar despacio</span>
                  </button>

                  {isSolved && (
                    <p className="w-full pt-1 text-xs font-semibold text-[#047857]">
                      Audio completo: &ldquo;{exercise.spokenFrench}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* BLOCK 1, 2, 3 MULTIPLE CHOICE */}
              {exercise.options && exercise.options.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {exercise.options.map((opt) => {
                    const selected = exState.selectedOption === opt.id;
                    const isRightOpt =
                      isSolved && opt.id === exercise.correctAnswer;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isSolved}
                        onClick={() => {
                          registerActivity();
                          updateExerciseState(exercise.id, (prev) => ({
                            ...prev,
                            selectedOption: opt.id,
                          }));
                        }}
                        className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${
                          isRightOpt
                            ? 'border-[#10B981] bg-[#ECFDF5] text-[#047857]'
                            : selected
                            ? 'border-[#2B4C7E] bg-[#EFF6FF] text-[#1E293B] shadow-xs'
                            : 'border-[#ECE5D8] bg-white text-[#1E293B] hover:border-[#2B4C7E]/45'
                        }`}
                      >
                        <div>
                          <p className="text-base font-bold">{opt.label}</p>
                          {opt.subLabel && (
                            <p className="text-xs text-[#64748B]">
                              {opt.subLabel}
                            </p>
                          )}
                        </div>
                        {selected && !isSolved && (
                          <PointingHandCue className="h-5 w-5 shrink-0" />
                        )}
                        {isRightOpt && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-[#059669]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* BLOCK 4 CONTEXT FILL */}
              {exercise.kind === 'context-fill' && exercise.sentenceParts && (
                <div className="mt-4 space-y-3 rounded-2xl border border-[#ECE5D8] bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-[#1E293B]">
                    <span>{exercise.sentenceParts.before}</span>
                    <input
                      ref={inputRef}
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
                        if (e.key === 'Enter' && !isSolved && canCheck) {
                          handleCheckAnswer();
                        }
                      }}
                      placeholder="participe..."
                      aria-label="Escribe el participe passé"
                      className={`w-40 rounded-xl border px-3 py-1.5 text-center text-base font-bold outline-none transition ${
                        isSolved
                          ? 'border-[#10B981] bg-[#ECFDF5] text-[#047857]'
                          : 'border-[#2B4C7E]/40 bg-[#FBF9F5] text-[#2B4C7E] focus:border-[#2B4C7E] focus:bg-white'
                      }`}
                    />
                    <span>{exercise.sentenceParts.after}</span>
                  </div>

                  {!isSolved && (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-[#F1ECE2] pt-3">
                      <span className="mr-1 text-[11px] font-bold text-[#64748B]">
                        Tildes rápidas:
                      </span>
                      {FRENCH_ACCENT_KEYS.map((ch) => (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => handleInsertAccent(ch)}
                          className="inline-flex h-8 min-w-[2.1rem] items-center justify-center rounded-lg border border-[#ECE5D8] bg-[#FBF9F5] px-2 text-sm font-bold text-[#2B4C7E] transition hover:border-[#2B4C7E] hover:bg-white"
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* BLOCK 5 FAMILY DEDUCTION (PAGE 4) */}
              {exercise.kind === 'family-deduction' && exercise.familyModel && (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#2B4C7E]/25 bg-[#EFF6FF]/60 p-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[#2B4C7E]">
                        Familia modelo conocida
                      </span>
                      <p className="mt-1 text-base font-bold text-[#1E293B]">
                        {exercise.familyModel.infinitive} →{' '}
                        <span className="text-[#2B4C7E]">
                          {exercise.familyModel.participle}
                        </span>
                      </p>
                      <p className="text-xs text-[#475569]">
                        {exercise.familyModel.ruleNote}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        speakFrench(
                          `${exercise.familyModel?.infinitive}, ${exercise.familyModel?.participle}`
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#2B4C7E]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#2B4C7E]"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Oír modelo</span>
                    </button>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-[#ECE5D8] bg-white p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-3 text-base font-bold text-[#1E293B]">
                      <span>{exercise.infinitive}</span>
                      <ArrowRight className="h-4 w-4 text-[#E63946]" />
                      <input
                        ref={inputRef}
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
                          if (e.key === 'Enter' && !isSolved && canCheck) {
                            handleCheckAnswer();
                          }
                        }}
                        placeholder="deduce el participio..."
                        aria-label="Deduce el participe passé"
                        className={`w-52 rounded-xl border px-3 py-2 text-base font-bold outline-none transition ${
                          isSolved
                            ? 'border-[#10B981] bg-[#ECFDF5] text-[#047857]'
                            : 'border-[#2B4C7E]/40 bg-[#FBF9F5] text-[#2B4C7E] focus:border-[#2B4C7E] focus:bg-white'
                        }`}
                      />
                    </div>

                    {!isSolved && (
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-[#F1ECE2] pt-3">
                        <span className="mr-1 text-[11px] font-bold text-[#64748B]">
                          Tildes rápidas:
                        </span>
                        {FRENCH_ACCENT_KEYS.map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => handleInsertAccent(ch)}
                            className="inline-flex h-8 min-w-[2.1rem] items-center justify-center rounded-lg border border-[#ECE5D8] bg-[#FBF9F5] px-2 text-sm font-bold text-[#2B4C7E] transition hover:border-[#2B4C7E] hover:bg-white"
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Check / Next Action Bar */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                {!isSolved ? (
                  <button
                    type="button"
                    disabled={!canCheck}
                    onClick={handleCheckAnswer}
                    className="inline-flex items-center gap-2 rounded-full bg-[#E63946] px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#D62839] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Check className="h-4 w-4" />
                    <span>Comprobar respuesta</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goNextExercise}
                    className="inline-flex items-center gap-2 rounded-full bg-[#059669] px-6 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#047857]"
                  >
                    <span>
                      {exerciseIdx + 1 < exercises.length
                        ? 'Siguiente ejercicio'
                        : 'Ir al siguiente bloque'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}

                {exState.attempts && !isSolved ? (
                  <span className="text-xs font-medium text-[#64748B]">
                    Intentos en este punto: {exState.attempts}
                  </span>
                ) : null}
              </div>

              {/* Immediate Post-Answer Pedagogical Feedback */}
              {isSolved && (
                <div className="mt-4 rounded-2xl border border-[#10B981]/35 bg-[#ECFDF5] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-[#047857]">
                        Retroalimentación inmediata ·{' '}
                        {FAMILY_BADGES[exercise.family].label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1E293B]">
                        {exercise.feedbackEs}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#2B4C7E]">
                        Ejemplo hablado: &ldquo;{exercise.spokenFrench}&rdquo;
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakFrench(exercise.spokenFrench)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#10B981]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#047857] transition hover:bg-[#F0FDF4]"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Escuchar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Persistent Feedback & Notes Space for every exercise */}
            <section className="mt-5 rounded-3xl border border-[#ECE5D8] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">
                    Espacio de retroalimentación y apuntes
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Registra cómo te sentiste con este verbo o pregúntale tu duda al tutor.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'clear', label: '¡Lo entendí!' },
                      { id: 'medium', label: 'Aún me cuesta' },
                      { id: 'doubt', label: 'Tengo duda' },
                    ] as const
                  ).map((item) => {
                    const active = exState.confidence === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          registerActivity();
                          updateExerciseState(exercise.id, (prev) => ({
                            ...prev,
                            confidence: item.id,
                          }));
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                          active
                            ? 'border-[#2B4C7E] bg-[#2B4C7E] text-white'
                            : 'border-[#ECE5D8] bg-[#FBF9F5] text-[#475569] hover:border-[#2B4C7E]/40'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#475569]">
                    Mis apuntes de este punto
                  </label>
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
                    placeholder="Ej. Recordar que vivre cambia a vécu y dû lleva û..."
                    className="w-full rounded-2xl border border-[#ECE5D8] bg-[#FBF9F5] p-3 text-xs text-[#1E293B] outline-none focus:border-[#2B4C7E] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-[#475569]">
                    Consulta rápida al tutor
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={doubtDraft}
                      onChange={(e) => {
                        registerActivity();
                        setDoubtDraft(e.target.value);
                      }}
                      placeholder="Ej. ¿Por qué dû lleva acento circunflejo?"
                      className="flex-1 rounded-2xl border border-[#ECE5D8] bg-[#FBF9F5] px-3 py-2 text-xs text-[#1E293B] outline-none focus:border-[#2B4C7E] focus:bg-white"
                    />
                    <button
                      type="button"
                      disabled={tutorLoading}
                      onClick={handleAskTutor}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-[#2B4C7E] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#1E3A63] disabled:opacity-50"
                    >
                      {tutorLoading ? (
                        <HelpCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Consultar</span>
                    </button>
                  </div>
                  {exState.aiTutorReply && (
                    <p className="mt-2 rounded-2xl border border-[#2B4C7E]/20 bg-[#EFF6FF] p-2.5 text-xs text-[#1E293B]">
                      {exState.aiTutorReply}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </main>
        </>
      )}
    </div>
  );
}
