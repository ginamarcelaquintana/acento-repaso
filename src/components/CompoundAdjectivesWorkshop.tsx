'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Mic,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type {
  HalfFillAndAnswerExercise,
  HalfFillPlusExamplesExercise,
  OpenCompoundInputExercise,
  OpenSpeakingWritingExercise,
  PairMatchExercise,
  TransformExercise,
  TwoBoxBuilderExercise,
  WorkshopExercise,
  WorkshopSection,
  WorkshopSheetId,
} from '@/types/workshop';
import {
  COMPOUND_PATTERNS,
  WORKSHOP_SHEETS,
  getAllExercisesInSheet,
} from '@/data/compound-adjectives-workshop';
import { PRAISE_EN, PhraseDeck } from '@/data/tutor-phrases';
import { voiceEngine } from '@/lib/voice-engine';
import { PointingHandCue } from './EditorialIllustrations';
import { TutorBubble, type TutorMood } from './TutorBubble';

const WORKSHOP_STORAGE_KEY = 'accento_compound_workshop_v1';

type ConfidenceRating = 'clear' | 'medium' | 'doubt';

interface ExerciseProgressState {
  solved?: boolean;
  attempts?: number;
  revealed?: boolean;
  hintLevel?: 0 | 1 | 2 | 3;
  // Saved inputs by exercise kind
  textInput?: string;
  selectedOption?: string;
  leftBox?: string;
  rightBox?: string;
  halfInputs?: string[];
  extraAnswerText?: string;
  example1?: string;
  example2?: string;
  // Feedback space
  confidence?: ConfidenceRating;
  feedbackNote?: string;
  aiTutorReply?: string;
}

type WorkshopStorageMap = Record<string, ExerciseProgressState>;

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

interface CompoundAdjectivesWorkshopProps {
  initialSheet?: WorkshopSheetId;
  voiceMuted?: boolean;
  onBack: () => void;
}

function normalizeAnswer(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, '')
    .trim();
}

function diagnoseCompoundMistake(
  userRaw: string,
  expectedList: string[]
): string | null {
  const userNorm = normalizeAnswer(userRaw);
  if (!userNorm) {
    return 'Escribe primero tu intento antes de comprobar; aunque dudes, probar te ayuda a fijar la regla.';
  }

  const hasPluralUnit = /\b\d+|ten|twelve|five|thirty|six|two|three\b.*\b(minutes|storeys|stories|years|pages|stars)\b/i.test(
    userNorm
  );
  if (hasPluralUnit) {
    return '¡Ojo con ese detalle clásico! Dentro de un adjetivo compuesto en inglés, el sustantivo medido va en SINGULAR (sin la "s", por ejemplo minute, year, page, storey).';
  }

  if (!userNorm.includes('-') && expectedList.some((a) => a.includes('-'))) {
    return 'Vas por muy buen camino en las palabras, pero te faltó unir con guion (-) las partes del adjetivo compuesto antes del sustantivo.';
  }

  const primary = normalizeAnswer(expectedList[0] ?? '');
  if (
    primary.startsWith('a ') ||
    primary.startsWith('an ')
  ) {
    const withoutArt = primary.replace(/^(a|an)\s+/, '');
    if (userNorm === withoutArt) {
      return 'El adjetivo compuesto está excelente; solo te faltó incluir el artículo correcto ("a" o "an") al inicio tal como pide la descripción.';
    }
    if (
      (primary.startsWith('a ') && userNorm.startsWith('an ')) ||
      (primary.startsWith('an ') && userNorm.startsWith('a '))
    ) {
      return '¡Casi! Revisa el artículo inicial ("a" antes de sonido consonante, "an" antes de sonido vocal).';
    }
  }

  if (/\bthat\b|\bwho\b|\bwhich\b/.test(userNorm)) {
    return 'Recuerda que debemos acortar la descripción eliminando "that / who / which" y colocando el adjetivo compuesto ANTES del sustantivo.';
  }

  return null;
}

function loadWorkshopStorage(): WorkshopStorageMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(WORKSHOP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object'
      ? (parsed as WorkshopStorageMap)
      : {};
  } catch {
    return {};
  }
}

function saveWorkshopStorage(data: WorkshopStorageMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WORKSHOP_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage limits cleanly
  }
}

export function CompoundAdjectivesWorkshop({
  initialSheet = 'pdf1',
  voiceMuted = false,
  onBack,
}: CompoundAdjectivesWorkshopProps) {
  const [sheetId, setSheetId] = useState<WorkshopSheetId>(initialSheet);
  const [sectionId, setSectionId] = useState<string>(
    WORKSHOP_SHEETS[initialSheet].sections[0].id
  );
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [showPatternsTable, setShowPatternsTable] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [store, setStore] = useState<WorkshopStorageMap>({});
  const [hydrated, setHydrated] = useState(false);

  const [tutorMessage, setTutorMessage] = useState(
    'Vamos paso a paso. Mira la fotografía, lee la pista de la situación e inténtalo. Si te quedas pensando más de 30 segundos, te daré una pista suave.'
  );
  const [tutorMood, setTutorMood] = useState<TutorMood>('neutral');
  const [activeClue, setActiveClue] = useState<string | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Inactivity & progressive hint state (auto-unlock at 30s, 60s, 90s)
  const [idleSeconds, setIdleSeconds] = useState(0);
  const lastActivityRef = useRef<number>(0);

  // Temporary feedback status & AI tutor loading state
  const [tutorLoading, setTutorLoading] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [micListening, setMicListening] = useState(false);
  const [micFeedback, setMicFeedback] = useState<string | null>(null);

  const praiseDeckRef = useRef(new PhraseDeck(PRAISE_EN));

  const supportsMic = useSyncExternalStore(
    () => () => {},
    () => {
      const win = window as unknown as {
        SpeechRecognition?: unknown;
        webkitSpeechRecognition?: unknown;
      };
      return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
    },
    () => false
  );

  // Hydrate persisted workshop state cleanly
  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setStore(loadWorkshopStorage());
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
      saveWorkshopStorage(store);
    }
  }, [store, hydrated]);

  const currentSheet = WORKSHOP_SHEETS[sheetId];
  const currentSection: WorkshopSection = useMemo(
    () =>
      currentSheet.sections.find((s) => s.id === sectionId) ??
      currentSheet.sections[0],
    [currentSheet, sectionId]
  );

  const exercises = currentSection.exercises;
  const exercise: WorkshopExercise | undefined =
    exercises[exerciseIdx] ?? exercises[0];

  const exState: ExerciseProgressState = useMemo(
    () => (exercise ? store[exercise.id] ?? {} : {}),
    [store, exercise]
  );

  const isSolved = Boolean(exState.solved);
  const hintLevel: 0 | 1 | 2 | 3 = exState.hintLevel ?? 0;

  const updateExerciseState = useCallback(
    (
      exId: string,
      updater: (prev: ExerciseProgressState) => ExerciseProgressState
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
    setIdleSeconds(0);
  }, []);

  // Speak tutor phrase cleanly in Colombian Spanish / mixed English
  const speakCoachMessage = useCallback(
    (msg: string, mood: TutorMood, clue?: string) => {
      setTutorMessage(msg);
      setTutorMood(mood);
      setActiveClue(clue);
      if (!voiceMuted) {
        voiceEngine.speak({
          text: clue ?? msg,
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

  const speakEnglishAudio = useCallback((phrase: string) => {
    voiceEngine.speak({
      text: phrase,
      mode: 'en',
      targetLang: 'en',
      muted: false,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  }, []);

  // Automatic 30s / 60s / 90s progressive guidance timer when student pauses
  useEffect(() => {
    if (!hydrated || !exercise || isSolved || showSummary) return;

    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setIdleSeconds(elapsed);

      if (elapsed >= 90 && hintLevel < 3) {
        const hint3 = exercise.progressiveHints[2];
        updateExerciseState(exercise.id, (prev) => ({ ...prev, hintLevel: 3 }));
        speakCoachMessage(
          'Llevas un ratito pensándolo, así que activé la pista nivel 3 para orientarte paso a paso sin resolvértelo.',
          'coaching',
          hint3
        );
      } else if (elapsed >= 60 && hintLevel < 2) {
        const hint2 = exercise.progressiveHints[1];
        updateExerciseState(exercise.id, (prev) => ({ ...prev, hintLevel: 2 }));
        speakCoachMessage(
          '¿Todavía dudando? Mira la estructura clave que te señalo abajo (pista 2 de 3).',
          'coaching',
          hint2
        );
      } else if (elapsed >= 30 && hintLevel < 1) {
        const hint1 = exercise.progressiveHints[0];
        updateExerciseState(exercise.id, (prev) => ({ ...prev, hintLevel: 1 }));
        speakCoachMessage(
          'Veo que te tomaste 30 segundos para pensar este punto. Mira esta primera orientación suave:',
          'coaching',
          hint1
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
    speakCoachMessage,
  ]);

  const goToExercise = useCallback(
    (nextSheetId: WorkshopSheetId, nextSectionId: string, nextIdx: number) => {
      voiceEngine.stop();
      setSheetId(nextSheetId);
      setSectionId(nextSectionId);
      setExerciseIdx(nextIdx);
      setShowSummary(false);
      setMicFeedback(null);
      lastActivityRef.current = Date.now();
      setIdleSeconds(0);

      const targetSection = WORKSHOP_SHEETS[nextSheetId].sections.find(
        (s) => s.id === nextSectionId
      );
      const targetEx = targetSection?.exercises[nextIdx];
      const saved = targetEx ? store[targetEx.id] : undefined;

      if (saved?.solved) {
        setTutorMessage(
          'Este ejercicio ya lo completaste. Puedes escucharlo en inglés o revisar tu retroalimentación abajo.'
        );
        setTutorMood('praise');
        setActiveClue(undefined);
      } else if (saved?.hintLevel && saved.hintLevel > 0 && targetEx) {
        setTutorMessage('Retomamos este punto con la pista que ya habías desbloqueado.');
        setTutorMood('coaching');
        setActiveClue(targetEx.progressiveHints[saved.hintLevel - 1]);
      } else {
        setTutorMessage(
          'Observa la fotografía, lee el punto y prueba tu respuesta. Si pasas 30 segundos sin escribir, te daré una pista progresiva.'
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
    const nextLevel = Math.min(3, hintLevel + 1) as 1 | 2 | 3;
    const clue = exercise.progressiveHints[nextLevel - 1];
    updateExerciseState(exercise.id, (prev) => ({
      ...prev,
      hintLevel: Math.max(prev.hintLevel ?? 0, nextLevel) as 0 | 1 | 2 | 3,
    }));
    speakCoachMessage(
      `Aquí tienes la pista ${nextLevel} de 3 para guiarte sin darte la respuesta directa:`,
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
    }));
    setTutorMood('neutral');
    setActiveClue(undefined);
    setTutorMessage(
      `Mira cómo quedaba este punto y lee su explicación abajo para que el siguiente salga al tiro: ${exercise.feedbackEs}`
    );
    if (!voiceMuted) {
      speakEnglishAudio(exercise.spokenEnglish);
    }
  };

  const markCorrectAndPraise = (ex: WorkshopExercise, extraPatch?: Partial<ExerciseProgressState>) => {
    updateExerciseState(ex.id, (prev) => ({
      ...prev,
      ...extraPatch,
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
          speakEnglishAudio(ex.spokenEnglish);
        },
      });
    }
  };

  const handleWrongAttempt = (
    ex: WorkshopExercise,
    customDiagnostic: string | null,
    extraPatch?: Partial<ExerciseProgressState>
  ) => {
    const prevAttempts = exState.attempts ?? 0;
    const nextAttempts = prevAttempts + 1;
    const nextHint = Math.min(3, Math.max(hintLevel + 1, 1)) as 1 | 2 | 3;
    updateExerciseState(ex.id, (prev) => ({
      ...prev,
      ...extraPatch,
      attempts: nextAttempts,
      hintLevel: nextHint,
    }));

    const clueText = customDiagnostic ?? ex.progressiveHints[nextHint - 1];
    speakCoachMessage(
      nextAttempts === 1
        ? '¡Casi! No te doy la respuesta aún porque sé que puedes sacarla con esta orientación:'
        : 'Hagámoslo paso a paso con esta guía más directa:',
      'coaching',
      clueText
    );
  };

  // Evaluate handlers for each exercise kind
  const submitTransform = (ex: TransformExercise) => {
    registerActivity();
    const userText = exState.textInput ?? '';
    const normUser = normalizeAnswer(userText);
    const matched = ex.acceptedAnswers.some((ans) => normalizeAnswer(ans) === normUser);

    if (matched) {
      markCorrectAndPraise(ex);
    } else {
      handleWrongAttempt(ex, diagnoseCompoundMistake(userText, ex.acceptedAnswers));
    }
  };

  const selectPairMatch = (ex: PairMatchExercise, letter: string) => {
    registerActivity();
    updateExerciseState(ex.id, (prev) => ({ ...prev, selectedOption: letter }));
    if (letter === ex.correctLetter) {
      markCorrectAndPraise(ex, { selectedOption: letter });
    } else {
      handleWrongAttempt(
        ex,
        `Fíjate bien en "${ex.leftWord}": busca en la columna derecha la palabra que unida forme el adjetivo compuesto con sentido real.`
      );
    }
  };

  const selectGapFillBank = (ex: WorkshopExercise & { kind: 'gap-fill-bank' }, word: string) => {
    registerActivity();
    updateExerciseState(ex.id, (prev) => ({ ...prev, selectedOption: word }));
    const ok = ex.acceptedAnswers.some(
      (a) => normalizeAnswer(a) === normalizeAnswer(word)
    );
    if (ok) {
      markCorrectAndPraise(ex, { selectedOption: word });
    } else {
      handleWrongAttempt(ex, null, { selectedOption: word });
    }
  };

  const submitTwoBox = (ex: TwoBoxBuilderExercise) => {
    registerActivity();
    const left = exState.leftBox ?? '';
    const right = exState.rightBox ?? '';
    if (!left || !right) {
      speakCoachMessage(
        'Elige primero una palabra de la Caja 1 y otra palabra de la Caja 2 para probar tu combinación.',
        'coaching'
      );
      return;
    }
    if (left === ex.expectedLeft && right === ex.expectedRight) {
      markCorrectAndPraise(ex);
    } else {
      const partialNote =
        left === ex.expectedLeft
          ? `¡La primera palabra ("${left}") está perfecta! Ahora revisa cuál de la Caja 2 encaja con la oración.`
          : right === ex.expectedRight
            ? `¡La segunda palabra ("${right}") sí es! Solo cambia la de la Caja 1.`
            : null;
      handleWrongAttempt(ex, partialNote);
    }
  };

  const submitOpenInput = (ex: OpenCompoundInputExercise) => {
    registerActivity();
    const userText = exState.textInput ?? '';
    const normUser = normalizeAnswer(userText);
    const matched = ex.acceptedAnswers.some((a) => normalizeAnswer(a) === normUser);
    if (matched) {
      markCorrectAndPraise(ex);
    } else {
      handleWrongAttempt(ex, diagnoseCompoundMistake(userText, ex.acceptedAnswers));
    }
  };

  const submitHalfFillAndAnswer = (ex: HalfFillAndAnswerExercise) => {
    registerActivity();
    const halves = exState.halfInputs ?? [];
    const allHalvesValid = ex.slots.every((slot, idx) =>
      slot.acceptedHalves.some(
        (h) => normalizeAnswer(h) === normalizeAnswer(halves[idx] ?? '')
      )
    );

    if (!allHalvesValid) {
      handleWrongAttempt(
        ex,
        'Escribe solo la parte que falta al lado del guion (sin repetir la palabra que ya está escrita).'
      );
      return;
    }

    const answerSentence = (exState.extraAnswerText ?? '').trim();
    if (answerSentence.length < 4) {
      speakCoachMessage(
        '¡Las mitades del adjetivo quedaron perfectas! Ahora responde la pregunta en inglés en el recuadro de abajo (puedes apoyarte en los chips sugeridos).',
        'coaching',
        ex.suggestedChips.join(' · ')
      );
      updateExerciseState(ex.id, (prev) => ({
        ...prev,
        hintLevel: Math.max(prev.hintLevel ?? 0, 1) as 0 | 1 | 2 | 3,
      }));
      return;
    }

    markCorrectAndPraise(ex);
  };

  const submitHalfFillExamples = (ex: HalfFillPlusExamplesExercise) => {
    registerActivity();
    const missing = exState.textInput ?? '';
    const okHalf = ex.acceptedMissingWords.some(
      (w) => normalizeAnswer(w) === normalizeAnswer(missing)
    );
    if (!okHalf) {
      handleWrongAttempt(
        ex,
        diagnoseCompoundMistake(missing, ex.acceptedMissingWords)
      );
      return;
    }

    const ex1 = (exState.example1 ?? '').trim();
    const ex2 = (exState.example2 ?? '').trim();
    if (ex1.length < 2 || ex2.length < 2) {
      speakCoachMessage(
        `¡"${ex.expectedMissingWord}" es correcto! Ahora escribe 2 ejemplos reales en los cuadros de abajo (puedes inspirarte en los chips de apoyo).`,
        'coaching',
        `Ejemplos posibles: ${ex.suggestedExamples.slice(0, 3).join(', ')}`
      );
      return;
    }

    markCorrectAndPraise(ex);
  };

  const submitSpeakingWriting = (ex: OpenSpeakingWritingExercise) => {
    registerActivity();
    const draft = (exState.textInput ?? '').trim();
    const compoundsFound = draft.match(/\b[a-zA-Z]+-[a-zA-Z]+(?:-[a-zA-Z]+)?\b/g) ?? [];
    if (draft.length < 15 || compoundsFound.length === 0) {
      handleWrongAttempt(
        ex,
        'Escribe al menos 1 o 2 frases en inglés usando uno o más adjetivos compuestos con guion (por ejemplo: ' +
          ex.suggestedAdjectives.slice(0, 3).join(', ') +
          ').'
      );
      return;
    }
    markCorrectAndPraise(ex);
  };

  // Practice pronunciation for Ex D speaking
  const handleMicPractice = (expectedPhrase: string) => {
    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec || micListening) return;

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setMicListening(true);
    setMicFeedback('Escuchando tu pronunciación en inglés...');

    rec.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript ?? '';
      const clean = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, '').trim();
      const targetWords = clean(expectedPhrase).split(/\s+/).filter(Boolean);
      const spokenWords = clean(spoken).split(/\s+/).filter(Boolean);
      const hits = targetWords.filter((w) => spokenWords.includes(w)).length;
      const ratio = targetWords.length > 0 ? hits / targetWords.length : 0;

      if (ratio >= 0.55) {
        setMicFeedback(`¡Excelente pronunciación! Escuché: "${spoken}"`);
      } else {
        setMicFeedback(`Escuché "${spoken}". Escucha el audio modelo y vuelve a intentarlo despacio.`);
      }
    };
    rec.onerror = () => {
      setMicFeedback('No pude activar el micrófono; revisa el permiso del navegador.');
      setMicListening(false);
    };
    rec.onend = () => setMicListening(false);
    rec.start();
  };

  // Request AI Tutor tailored feedback inside the Exercise Feedback Space
  const handleAskFeedbackTutor = async () => {
    if (!exercise || tutorLoading) return;
    registerActivity();
    setTutorLoading(true);

    const attemptSummary = [
      exState.textInput ? `texto="${exState.textInput}"` : '',
      exState.selectedOption ? `selección="${exState.selectedOption}"` : '',
      exState.leftBox || exState.rightBox
        ? `cajas="${exState.leftBox ?? '?'}-${exState.rightBox ?? '?'}"`
        : '',
      exState.halfInputs?.length ? `mitades="${exState.halfInputs.join(' / ')}"` : '',
      exState.feedbackNote ? `comentario estudiante="${exState.feedbackNote}"` : '',
    ]
      .filter(Boolean)
      .join(', ');

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          topicSlug: 'en-b1-compound-adjectives',
          topicTitle: 'Adjetivos Compuestos (Compound Adjectives)',
          language: 'en',
          level: 'B1',
          questionPrompt: `${exercise.promptEs} (${exercise.imageCaptionEs})`,
          studentDoubt: attemptSummary
            ? `Revisa mi avance (${attemptSummary}) sin darme solo la solución fría; dame retroalimentación cálida y clara.`
            : `Dame una retroalimentación guiada sobre este punto sin resolverlo por mí.`,
          currentHint: exercise.progressiveHints[Math.max(0, hintLevel - 1)],
          currentExplanation: exercise.feedbackEs,
        }),
      });
      const data = (await res.json()) as { reply?: string };
      const reply = data.reply?.trim() || exercise.feedbackEs;
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
        aiTutorReply: exercise.feedbackEs,
      }));
    } finally {
      setTutorLoading(false);
    }
  };

  // Compute progress metrics
  const sheetStats = useMemo(() => {
    const compute = (id: WorkshopSheetId) => {
      const all = getAllExercisesInSheet(WORKSHOP_SHEETS[id]);
      const solved = all.filter((e) => store[e.id]?.solved).length;
      return { solved, total: all.length };
    };
    return {
      pdf1: compute('pdf1'),
      pdf2: compute('pdf2'),
    };
  }, [store]);

  const moveNextExercise = () => {
    if (exerciseIdx + 1 < exercises.length) {
      goToExercise(sheetId, currentSection.id, exerciseIdx + 1);
      return;
    }
    const secIndex = currentSheet.sections.findIndex(
      (s) => s.id === currentSection.id
    );
    if (secIndex >= 0 && secIndex + 1 < currentSheet.sections.length) {
      goToExercise(sheetId, currentSheet.sections[secIndex + 1].id, 0);
      return;
    }
    setShowSummary(true);
  };

  const movePrevExercise = () => {
    if (exerciseIdx > 0) {
      goToExercise(sheetId, currentSection.id, exerciseIdx - 1);
      return;
    }
    const secIndex = currentSheet.sections.findIndex(
      (s) => s.id === currentSection.id
    );
    if (secIndex > 0) {
      const prevSec = currentSheet.sections[secIndex - 1];
      goToExercise(sheetId, prevSec.id, prevSec.exercises.length - 1);
    }
  };

  const handleCopyFullReport = async () => {
    const lines: string[] = [
      'ACCENTO — REPORTE DE TALLER GUIADO: COMPOUND ADJECTIVES',
      `Guía 1 (Teach-This): ${sheetStats.pdf1.solved}/${sheetStats.pdf1.total} resueltos`,
      `Guía 2 (EnglishClub): ${sheetStats.pdf2.solved}/${sheetStats.pdf2.total} resueltos`,
      '',
    ];

    for (const sheetKey of ['pdf1', 'pdf2'] as const) {
      const sh = WORKSHOP_SHEETS[sheetKey];
      lines.push(`=== ${sh.titleEs} ===`);
      for (const sec of sh.sections) {
        lines.push(`-- ${sec.titleEs} --`);
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
          const note = st?.feedbackNote?.trim() ? ` | Nota: ${st.feedbackNote.trim()}` : '';
          lines.push(`  ${sec.letter}.${ex.number}: ${status} (${conf})${note}`);
        }
      }
      lines.push('');
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    } catch {
      // Clipboard unsupported
    }
  };

  if (!exercise) return null;

  // Used options in Section B matching / Gap fill for subtle visual aid
  const usedValuesInSection = new Set<string>();
  for (const item of currentSection.exercises) {
    if (item.id === exercise.id) continue;
    const itemSt = store[item.id];
    if (itemSt?.solved && itemSt.selectedOption) {
      usedValuesInSection.add(itemSt.selectedOption);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Top Controls Bar */}
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
            onClick={() => setShowPatternsTable((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              showPatternsTable
                ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                : 'border-[#E6DEC8] bg-white text-[#1E293B] hover:border-[#2563EB]/40'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{showPatternsTable ? 'Ocultar 8 fórmulas' : 'Ver 8 fórmulas'}</span>
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
                : `Resumen (${sheetStats.pdf1.solved + sheetStats.pdf2.solved}/87)`}
            </span>
          </button>
        </div>
      </div>

      {/* Sheet Switcher Cards (PDF 1 vs PDF 2) */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(['pdf1', 'pdf2'] as const).map((id) => {
          const sh = WORKSHOP_SHEETS[id];
          const stat = sheetStats[id];
          const active = sheetId === id && !showSummary;
          return (
            <button
              key={id}
              type="button"
              onClick={() => goToExercise(id, sh.sections[0].id, 0)}
              className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition ${
                active
                  ? id === 'pdf1'
                    ? 'border-[#D94646] bg-white shadow-sm'
                    : 'border-[#2563EB] bg-white shadow-sm'
                  : 'border-[#ECE5D8] bg-white/75 hover:border-[#CBD5E1] hover:bg-white'
              }`}
            >
              <div className="min-w-0">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    id === 'pdf1'
                      ? 'bg-[#FEF2F2] text-[#D94646]'
                      : 'bg-[#EFF6FF] text-[#2563EB]'
                  }`}
                >
                  {sh.sourceLabel} · {sh.levelLabel}
                </span>
                <h1 className="font-display mt-1 text-sm font-extrabold text-[#1E293B] sm:text-base">
                  {sh.titleEs}
                </h1>
              </div>
              <span className="shrink-0 rounded-xl bg-[#FAF7F2] px-3 py-1.5 text-xs font-extrabold text-[#1E293B]">
                {stat.solved}/{stat.total}
              </span>
            </button>
          );
        })}
      </div>

      {/* Collapsible 8 Rules Reference Table from PDF 1 */}
      {showPatternsTable && (
        <div className="mt-4 rounded-3xl border border-[#ECE5D8] bg-white p-5 shadow-xs animate-soft-pop">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-extrabold text-[#1E293B]">
                Las 8 fórmulas clave de Compound Adjectives
              </h2>
              <p className="text-xs text-[#64748B]">
                Toca cualquier ejemplo para escuchar cómo suena en inglés natural.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {COMPOUND_PATTERNS.map((rule) => (
              <button
                key={rule.id}
                type="button"
                onClick={() =>
                  speakEnglishAudio(
                    `${rule.sentenceBefore} ${rule.highlight} ${rule.sentenceAfter}`
                  )
                }
                className="flex items-start justify-between gap-3 rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2]/75 p-3.5 text-left transition hover:border-[#2563EB]/40 hover:bg-white"
              >
                <div className="min-w-0">
                  <span className="inline-block rounded-md bg-white px-2 py-0.5 text-[11px] font-extrabold text-[#2563EB]">
                    {rule.pattern}
                  </span>
                  <p className="mt-1.5 text-xs font-semibold text-[#1E293B]">
                    {rule.sentenceBefore}{' '}
                    <strong className="rounded bg-[#FEF2F2] px-1 text-[#D94646]">
                      {rule.highlight}
                    </strong>{' '}
                    {rule.sentenceAfter}
                  </p>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    {rule.explanationEs}
                  </p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#D94646] shadow-2xs">
                  <Volume2 className="h-4 w-4" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary & Feedback Report View */}
      {showSummary ? (
        <div className="mt-5 rounded-[30px] border border-[#ECE5D8] bg-white p-6 shadow-xs sm:p-8 animate-soft-pop">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#1E293B]">
                Resumen de avance y retroalimentación
              </h2>
              <p className="mt-1 text-xs text-[#64748B]">
                Guía 1: {sheetStats.pdf1.solved}/47 · Guía 2:{' '}
                {sheetStats.pdf2.solved}/40 · Total:{' '}
                {sheetStats.pdf1.solved + sheetStats.pdf2.solved}/87 ejercicios
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyFullReport}
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

          <div className="mt-6 space-y-5">
            {(['pdf1', 'pdf2'] as const).map((id) => {
              const sh = WORKSHOP_SHEETS[id];
              return (
                <div
                  key={id}
                  className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2]/60 p-4"
                >
                  <h3 className="font-display text-sm font-extrabold text-[#1E293B]">
                    {sh.titleEs}
                  </h3>
                  <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {sh.sections.map((sec) => {
                      const doneCount = sec.exercises.filter(
                        (e) => store[e.id]?.solved
                      ).length;
                      const notesCount = sec.exercises.filter((e) =>
                        Boolean(store[e.id]?.feedbackNote?.trim())
                      ).length;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => goToExercise(id, sec.id, 0)}
                          className="flex items-center justify-between rounded-xl border border-[#ECE5D8] bg-white px-3.5 py-2.5 text-left transition hover:border-[#2563EB]/40"
                        >
                          <div>
                            <p className="text-xs font-bold text-[#1E293B]">
                              {sec.titleEs}
                            </p>
                            {notesCount > 0 && (
                              <p className="mt-0.5 text-[11px] font-semibold text-[#D97706]">
                                {notesCount}{' '}
                                {notesCount === 1
                                  ? 'nota de retroalimentación'
                                  : 'notas de retroalimentación'}
                              </p>
                            )}
                          </div>
                          <span className="rounded-lg bg-[#FAF7F2] px-2.5 py-1 text-xs font-extrabold text-[#059669]">
                            {doneCount}/{sec.exercises.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Section Navigation Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {currentSheet.sections.map((sec) => {
              const active = sec.id === currentSection.id;
              const secDone = sec.exercises.filter(
                (e) => store[e.id]?.solved
              ).length;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => goToExercise(sheetId, sec.id, 0)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold transition ${
                    active
                      ? 'border-[#1E293B] bg-[#1E293B] text-white shadow-xs'
                      : 'border-[#ECE5D8] bg-white text-[#475569] hover:border-[#CBD5E1] hover:text-[#1E293B]'
                  }`}
                >
                  <span>Parte {sec.letter}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[#FAF7F2] text-[#64748B]'
                    }`}
                  >
                    {secDone}/{sec.exercises.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Numbered Stepper Pills inside Current Section */}
          <div className="mt-3 rounded-2xl border border-[#ECE5D8] bg-white p-3.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-extrabold text-[#1E293B]">
                {currentSection.titleEs}
              </p>
              <span className="text-[11px] font-semibold text-[#64748B]">
                Punto {exerciseIdx + 1} de {exercises.length}
              </span>
            </div>
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
                    onClick={() => goToExercise(sheetId, currentSection.id, idx)}
                    className={`relative flex h-8 min-w-8 items-center justify-center rounded-xl border px-2 text-xs font-extrabold transition ${
                      active
                        ? 'border-[#D94646] bg-[#D94646] text-white shadow-xs'
                        : solved
                          ? 'border-[#10B981]/50 bg-[#ECFDF5] text-[#059669]'
                          : 'border-[#E6DEC8] bg-[#FAF7F2] text-[#475569] hover:bg-white'
                    }`}
                    aria-label={`Ir al ejercicio ${item.number}`}
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

          {/* Guided Tutor Bubble (auto-unlocks progressive clues after 30s/60s/90s pause) */}
          <div className="mt-4">
            <TutorBubble
              message={tutorMessage}
              mood={tutorMood}
              isSpeaking={isSpeaking}
              clueLabel={activeClue}
            />
          </div>

          {/* Main Active Exercise Workspace Card */}
          <div className="mt-4 overflow-hidden rounded-[30px] border border-[#ECE5D8] bg-white shadow-xs">
            {/* Custom Real Photograph for This Specific Exercise */}
            <div className="relative aspect-[16/9] max-h-72 w-full overflow-hidden bg-[#1E293B]">
              <img
                src={exercise.imagePath}
                alt={exercise.imageCaptionEs}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-4">
                <div className="min-w-0">
                  <span className="inline-block rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-extrabold text-[#1E293B]">
                    Guía {sheetId === 'pdf1' ? '1' : '2'} · Parte{' '}
                    {currentSection.letter} · Punto {exercise.number}
                  </span>
                  <p className="mt-1 text-xs font-semibold text-white sm:text-sm">
                    {exercise.imageCaptionEs}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => speakEnglishAudio(exercise.spokenEnglish)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#D94646] shadow-md transition hover:scale-105"
                  aria-label="Escuchar pronunciación del contexto en inglés"
                  title="Escuchar pronunciación en inglés"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              {/* Guidance Status & Progressive Hint Trigger */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF7F2] px-3 py-1 text-[11px] font-bold text-[#64748B]">
                  <Clock className="h-3.5 w-3.5 text-[#D97706]" />
                  {isSolved ? (
                    <span className="text-[#059669]">Punto resuelto</span>
                  ) : hintLevel > 0 ? (
                    <span>Guía paso a paso · Nivel {hintLevel}/3</span>
                  ) : (
                    <span>
                      Ayuda automática tras 30s de pausa ({Math.min(30, idleSeconds)}s)
                    </span>
                  )}
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
                      <span>Pista ({hintLevel}/3)</span>
                    </button>

                    {(exState.attempts ?? 0) >= 2 && (
                      <button
                        type="button"
                        onClick={handleRevealGuided}
                        className="inline-flex items-center gap-1 rounded-full border border-[#E6DEC8] bg-[#FAF7F2] px-3 py-1 text-xs font-bold text-[#475569] hover:text-[#1E293B]"
                      >
                        <Lightbulb className="h-3.5 w-3.5 text-[#D97706]" />
                        <span>Ver cómo se forma</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Exercise Prompt */}
              <h2 className="font-display mt-3 text-lg font-extrabold leading-snug text-[#1E293B] sm:text-xl">
                {exercise.promptEs}
              </h2>

              {/* Accumulated Progressive Hints Trail */}
              {hintLevel > 0 && !isSolved && (
                <div className="mt-3 space-y-1.5 rounded-2xl border border-[#F59E0B]/40 bg-[#FFFBEB]/80 p-3.5">
                  {exercise.progressiveHints
                    .slice(0, hintLevel)
                    .map((hint, idx) => (
                      <div key={hint} className="flex items-start gap-2 text-xs text-[#78350F]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-[10px] font-extrabold text-white">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed font-medium">{hint}</span>
                      </div>
                    ))}
                </div>
              )}

              {/* === EXERCISE MECHANIC 1: TRANSFORM (PDF 1 Ex A) === */}
              {exercise.kind === 'transform' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4">
                    <span className="inline-block rounded-md bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#2563EB]">
                      Fórmula: {exercise.patternLabel}
                    </span>
                    <p className="font-display mt-2 text-base font-extrabold text-[#1E293B] sm:text-lg">
                      &ldquo;{exercise.sourcePhrase}&rdquo;
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitTransform(exercise);
                    }}
                    className="flex flex-col gap-2.5 sm:flex-row"
                  >
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
                      placeholder="Escribe la expresión corta (ej. a ten-minute walk)"
                      className="flex-1 rounded-2xl border-2 border-[#E6DEC8] bg-[#FAF7F2] px-4 py-3 text-sm font-bold text-[#1E293B] placeholder:font-normal placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white focus:outline-none disabled:border-[#10B981]/50 disabled:bg-[#ECFDF5]"
                    />
                    {!isSolved && (
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#D94646] px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#C23939]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Comprobar</span>
                      </button>
                    )}
                  </form>

                  {/* Scaffold Word Chips appear ONLY at Hint Level 3 before solving */}
                  {hintLevel >= 3 && !isSolved && (
                    <div className="rounded-2xl border border-[#E6DEC8] bg-[#FAF7F2]/70 p-3.5">
                      <p className="mb-2 text-[11px] font-bold text-[#64748B]">
                        Apoyo de armado (toca palabras para completar tu respuesta):
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
                            className="rounded-xl border border-[#DCD3C0] bg-white px-3 py-1.5 text-xs font-bold text-[#1E293B] hover:border-[#2563EB]"
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

              {/* === EXERCISE MECHANIC 2: PAIR MATCH (PDF 1 Ex B) === */}
              {exercise.kind === 'pair-match' && currentSection.pairOptions && (
                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4">
                    <span className="font-display text-lg font-extrabold text-[#1E293B]">
                      {exercise.number}. {exercise.leftWord}
                    </span>
                    <span className="text-base font-bold text-[#94A3B8]">—</span>
                    <span
                      className={`inline-flex min-w-[120px] items-center justify-center rounded-xl border-2 px-3 py-1.5 text-sm font-extrabold ${
                        isSolved
                          ? 'border-[#059669] bg-[#ECFDF5] text-[#065F46]'
                          : 'border-dashed border-[#94A3B8] bg-white text-[#64748B]'
                      }`}
                    >
                      {isSolved
                        ? `${exercise.correctLetter}. ${exercise.correctRightWord}`
                        : exState.selectedOption
                          ? `${exState.selectedOption}. ${
                              currentSection.pairOptions.find(
                                (o) => o.letter === exState.selectedOption
                              )?.word ?? ''
                            }`
                          : 'Elige a–l'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {currentSection.pairOptions.map((opt) => {
                      const picked = exState.selectedOption === opt.letter;
                      const isRight = opt.letter === exercise.correctLetter;
                      const alreadyUsed = usedValuesInSection.has(opt.letter);

                      let cls =
                        'border-[#ECE5D8] bg-[#FAF7F2]/60 text-[#1E293B] hover:border-[#2563EB] hover:bg-white';
                      if (isSolved && isRight) {
                        cls = 'border-[#059669] bg-[#ECFDF5] text-[#065F46]';
                      } else if (picked && !isRight) {
                        cls = 'border-[#F59E0B] bg-[#FFFBEB] text-[#92400E]';
                      } else if (alreadyUsed) {
                        cls = 'border-[#ECE5D8] bg-[#F5F0E6]/60 text-[#94A3B8]';
                      }

                      return (
                        <button
                          key={opt.letter}
                          type="button"
                          disabled={isSolved}
                          onClick={() => selectPairMatch(exercise, opt.letter)}
                          className={`flex items-center justify-between rounded-2xl border-2 px-3.5 py-2.5 text-left text-xs font-bold transition sm:text-sm ${cls}`}
                        >
                          <span>
                            <strong className="mr-1.5 text-[#64748B]">
                              {opt.letter}.
                            </strong>
                            {opt.word}
                          </span>
                          {alreadyUsed && !isSolved && (
                            <Check className="h-3.5 w-3.5 text-[#94A3B8]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* === EXERCISE MECHANIC 3: GAP-FILL WITH BANK (PDF 1 Ex C & PDF 2 Ex A) === */}
              {exercise.kind === 'gap-fill-bank' && currentSection.wordBank && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4 sm:p-5">
                    {exercise.grammarTypeLabel && (
                      <span className="mb-2 inline-block rounded-md bg-white px-2.5 py-0.5 text-[11px] font-extrabold text-[#2563EB]">
                        {exercise.grammarTypeLabel}
                      </span>
                    )}
                    <p className="text-base font-bold leading-relaxed text-[#1E293B] sm:text-lg">
                      {exercise.sentenceBefore ? `${exercise.sentenceBefore} ` : ''}
                      <span
                        className={`mx-1 inline-flex min-w-[125px] items-center justify-center rounded-xl border-2 px-3 py-0.5 text-sm font-extrabold ${
                          isSolved
                            ? 'border-[#059669] bg-[#ECFDF5] text-[#065F46]'
                            : exState.selectedOption
                              ? 'border-[#F59E0B] bg-[#FFFBEB] text-[#92400E]'
                              : 'border-dashed border-[#94A3B8] bg-white text-[#94A3B8]'
                        }`}
                      >
                        {isSolved
                          ? exercise.displayAnswer
                          : exState.selectedOption ?? '____________'}
                      </span>{' '}
                      {exercise.sentenceAfter}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {currentSection.wordBank.map((word) => {
                      const picked =
                        normalizeAnswer(exState.selectedOption ?? '') ===
                        normalizeAnswer(word);
                      const isRight = exercise.acceptedAnswers.some(
                        (a) => normalizeAnswer(a) === normalizeAnswer(word)
                      );
                      const usedElsewhere = Array.from(usedValuesInSection).some(
                        (u) => normalizeAnswer(u) === normalizeAnswer(word)
                      );

                      let cls =
                        'border-[#E6DEC8] bg-white text-[#1E293B] hover:border-[#2563EB] hover:bg-[#EFF6FF]/40';
                      if (isSolved && isRight) {
                        cls = 'border-[#059669] bg-[#ECFDF5] text-[#065F46]';
                      } else if (picked && !isRight) {
                        cls = 'border-[#F59E0B] bg-[#FFFBEB] text-[#92400E]';
                      } else if (usedElsewhere && !isSolved) {
                        cls = 'border-[#ECE5D8] bg-[#FAF7F2] text-[#94A3B8]';
                      }

                      return (
                        <button
                          key={word}
                          type="button"
                          disabled={isSolved}
                          onClick={() => selectGapFillBank(exercise, word)}
                          className={`rounded-2xl border-2 px-3.5 py-2 text-xs font-bold transition sm:text-sm ${cls}`}
                        >
                          {word}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* === EXERCISE MECHANIC 4: TWO-BOX BUILDER (PDF 2 Ex B) === */}
              {exercise.kind === 'two-box-builder' &&
                currentSection.boxLeftWords &&
                currentSection.boxRightWords && (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4 sm:p-5">
                      <p className="text-base font-bold leading-relaxed text-[#1E293B] sm:text-lg">
                        {exercise.sentenceBefore}{' '}
                        <span
                          className={`mx-1 inline-flex min-w-[130px] items-center justify-center rounded-xl border-2 px-3 py-0.5 text-sm font-extrabold ${
                            isSolved
                              ? 'border-[#059669] bg-[#ECFDF5] text-[#065F46]'
                              : 'border-[#2563EB]/45 bg-white text-[#2563EB]'
                          }`}
                        >
                          {isSolved
                            ? exercise.displayAnswer
                            : `${exState.leftBox ?? '___'}-${exState.rightBox ?? '___'}`}
                        </span>{' '}
                        {exercise.sentenceAfter}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2]/60 p-3.5">
                        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
                          Caja 1 · Primera palabra
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {currentSection.boxLeftWords.map((w) => {
                            const active = exState.leftBox === w;
                            return (
                              <button
                                key={w}
                                type="button"
                                disabled={isSolved}
                                onClick={() => {
                                  registerActivity();
                                  updateExerciseState(exercise.id, (prev) => ({
                                    ...prev,
                                    leftBox: w,
                                  }));
                                }}
                                className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition ${
                                  active
                                    ? 'border-[#D94646] bg-[#FEF2F2] text-[#D94646]'
                                    : 'border-[#E6DEC8] bg-white text-[#1E293B] hover:border-[#CBD5E1]'
                                }`}
                              >
                                {w}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2]/60 p-3.5">
                        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
                          Caja 2 · Segunda palabra
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {currentSection.boxRightWords.map((w) => {
                            const active = exState.rightBox === w;
                            return (
                              <button
                                key={w}
                                type="button"
                                disabled={isSolved}
                                onClick={() => {
                                  registerActivity();
                                  updateExerciseState(exercise.id, (prev) => ({
                                    ...prev,
                                    rightBox: w,
                                  }));
                                }}
                                className={`rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition ${
                                  active
                                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                                    : 'border-[#E6DEC8] bg-white text-[#1E293B] hover:border-[#CBD5E1]'
                                }`}
                              >
                                {w}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {!isSolved && (
                      <button
                        type="button"
                        onClick={() => submitTwoBox(exercise)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Comprobar combinación</span>
                      </button>
                    )}
                  </div>
                )}

              {/* === EXERCISE MECHANIC 5: OPEN COMPOUND INPUT (PDF 2 Ex C) === */}
              {exercise.kind === 'open-compound-input' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4 sm:p-5">
                    <p className="text-base font-bold leading-relaxed text-[#1E293B] sm:text-lg">
                      {exercise.sentenceBefore}{' '}
                      <span
                        className={`mx-1 inline-flex min-w-[125px] items-center justify-center rounded-xl border-2 px-3 py-0.5 text-sm font-extrabold ${
                          isSolved
                            ? 'border-[#059669] bg-[#ECFDF5] text-[#065F46]'
                            : 'border-dashed border-[#94A3B8] bg-white text-[#2563EB]'
                        }`}
                      >
                        {isSolved
                          ? exercise.displayAnswer
                          : exState.textInput?.trim() || '____________'}
                      </span>{' '}
                      {exercise.sentenceAfter}
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitOpenInput(exercise);
                    }}
                    className="flex flex-col gap-2.5 sm:flex-row"
                  >
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
                      placeholder="Escribe el adjetivo compuesto con guion..."
                      className="flex-1 rounded-2xl border-2 border-[#E6DEC8] bg-[#FAF7F2] px-4 py-3 text-sm font-bold text-[#1E293B] placeholder:font-normal placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white focus:outline-none disabled:border-[#10B981]/50 disabled:bg-[#ECFDF5]"
                    />
                    {!isSolved && (
                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Comprobar</span>
                      </button>
                    )}
                  </form>

                  {hintLevel >= 3 && !isSolved && (
                    <div className="rounded-2xl border border-[#E6DEC8] bg-[#FAF7F2]/70 p-3.5">
                      <p className="mb-2 text-[11px] font-bold text-[#64748B]">
                        Pistas interactivas (toca una opción para completar):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {exercise.scaffoldChips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              registerActivity();
                              updateExerciseState(exercise.id, (prev) => ({
                                ...prev,
                                textInput: chip.includes('-')
                                  ? chip
                                  : prev.textInput
                                    ? `${prev.textInput}-${chip}`
                                    : chip,
                              }));
                            }}
                            className="rounded-xl border border-[#DCD3C0] bg-white px-3 py-1.5 text-xs font-bold text-[#1E293B] hover:border-[#2563EB]"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* === EXERCISE MECHANIC 6: HALF-FILL & ANSWER (PDF 2 Ex D) === */}
              {exercise.kind === 'half-fill-and-answer' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-y-2 text-base font-bold leading-relaxed text-[#1E293B] sm:text-lg">
                      {exercise.slots.map((slot, sIdx) => {
                        const val = exState.halfInputs?.[sIdx] ?? '';
                        return (
                          <React.Fragment key={sIdx}>
                            {slot.textBefore && (
                              <span className="mr-1.5">{slot.textBefore}</span>
                            )}
                            <span className="mx-1 inline-flex items-center rounded-xl border-2 border-[#CBD5E1] bg-white px-2.5 py-1 text-sm">
                              {slot.prefixShown && (
                                <span className="font-extrabold text-[#1E293B]">
                                  {slot.prefixShown}
                                </span>
                              )}
                              <input
                                type="text"
                                value={isSolved ? slot.expectedHalf : val}
                                disabled={isSolved}
                                onChange={(e) => {
                                  registerActivity();
                                  const nextVal = e.target.value;
                                  updateExerciseState(exercise.id, (prev) => {
                                    const copy = [...(prev.halfInputs ?? [])];
                                    copy[sIdx] = nextVal;
                                    return { ...prev, halfInputs: copy };
                                  });
                                }}
                                aria-label={`Mitad faltante ${sIdx + 1}`}
                                placeholder="..."
                                className="w-24 bg-transparent px-1 font-extrabold text-[#2563EB] placeholder:text-[#94A3B8] focus:outline-none disabled:text-[#059669]"
                              />
                              {slot.suffixShown && (
                                <span className="font-extrabold text-[#1E293B]">
                                  {slot.suffixShown}
                                </span>
                              )}
                            </span>
                            {slot.textAfter && (
                              <span className="ml-1.5">{slot.textAfter}</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2]/60 p-4">
                    <label className="block text-xs font-extrabold text-[#1E293B]">
                      Tu respuesta en inglés ({exercise.discussionPromptEs}):
                    </label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {exercise.suggestedChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          disabled={isSolved}
                          onClick={() => {
                            registerActivity();
                            updateExerciseState(exercise.id, (prev) => {
                              const curr = (prev.extraAnswerText ?? '').trim();
                              return {
                                ...prev,
                                extraAnswerText: curr ? `${curr} ${chip}` : chip,
                              };
                            });
                          }}
                          className="rounded-full border border-[#DCD3C0] bg-white px-2.5 py-1 text-[11px] font-bold text-[#475569] hover:border-[#2563EB]"
                        >
                          + {chip}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={exState.extraAnswerText ?? ''}
                      disabled={isSolved}
                      onChange={(e) => {
                        registerActivity();
                        const val = e.target.value;
                        updateExerciseState(exercise.id, (prev) => ({
                          ...prev,
                          extraAnswerText: val,
                        }));
                      }}
                      placeholder="Ejemplo: I usually prefer..."
                      className="mt-2.5 w-full rounded-xl border border-[#DCD3C0] bg-white p-3 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
                    />
                    {!isSolved && (
                      <button
                        type="button"
                        onClick={() => submitHalfFillAndAnswer(exercise)}
                        className="mt-2.5 inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Comprobar y guardar respuesta</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* === EXERCISE MECHANIC 7: HALF-FILL + 2 EXAMPLES (PDF 2 Ex E) === */}
              {exercise.kind === 'half-fill-plus-examples' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-1.5 text-base font-bold text-[#1E293B] sm:text-lg">
                      <span>{exercise.prefix}</span>
                      <input
                        type="text"
                        value={
                          isSolved
                            ? exercise.expectedMissingWord
                            : exState.textInput ?? ''
                        }
                        disabled={isSolved}
                        onChange={(e) => {
                          registerActivity();
                          const val = e.target.value;
                          updateExerciseState(exercise.id, (prev) => ({
                            ...prev,
                            textInput: val,
                          }));
                        }}
                        aria-label="Palabra faltante del adjetivo compuesto"
                        placeholder="..."
                        className="w-28 rounded-xl border-2 border-[#CBD5E1] bg-white px-2.5 py-1 text-center text-sm font-extrabold text-[#2563EB] focus:border-[#2563EB] focus:outline-none disabled:border-[#059669] disabled:text-[#059669]"
                      />
                      {exercise.suffix && <span>{exercise.suffix}</span>}
                      <span>{exercise.textAfterPrompt}</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#475569]">
                        Ejemplo 1 en inglés
                      </label>
                      <input
                        type="text"
                        value={exState.example1 ?? ''}
                        disabled={isSolved}
                        onChange={(e) => {
                          registerActivity();
                          const val = e.target.value;
                          updateExerciseState(exercise.id, (prev) => ({
                            ...prev,
                            example1: val,
                          }));
                        }}
                        placeholder="Escribe un primer ejemplo..."
                        className="mt-1 w-full rounded-xl border border-[#DCD3C0] bg-[#FAF7F2] px-3.5 py-2.5 text-sm font-semibold text-[#1E293B] focus:border-[#2563EB] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#475569]">
                        Ejemplo 2 en inglés
                      </label>
                      <input
                        type="text"
                        value={exState.example2 ?? ''}
                        disabled={isSolved}
                        onChange={(e) => {
                          registerActivity();
                          const val = e.target.value;
                          updateExerciseState(exercise.id, (prev) => ({
                            ...prev,
                            example2: val,
                          }));
                        }}
                        placeholder="Escribe un segundo ejemplo..."
                        className="mt-1 w-full rounded-xl border border-[#DCD3C0] bg-[#FAF7F2] px-3.5 py-2.5 text-sm font-semibold text-[#1E293B] focus:border-[#2563EB] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {hintLevel >= 2 && !isSolved && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#64748B]">
                        Ideas sugeridas:
                      </span>
                      {exercise.suggestedExamples.map((sg) => (
                        <button
                          key={sg}
                          type="button"
                          onClick={() => {
                            registerActivity();
                            updateExerciseState(exercise.id, (prev) =>
                              !prev.example1?.trim()
                                ? { ...prev, example1: sg }
                                : { ...prev, example2: sg }
                            );
                          }}
                          className="rounded-full border border-[#DCD3C0] bg-white px-2.5 py-1 text-[11px] font-bold text-[#475569] hover:border-[#2563EB]"
                        >
                          + {sg}
                        </button>
                      ))}
                    </div>
                  )}

                  {!isSolved && (
                    <button
                      type="button"
                      onClick={() => submitHalfFillExamples(exercise)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#1D4ED8]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Comprobar punto y ejemplos</span>
                    </button>
                  )}
                </div>
              )}

              {/* === EXERCISE MECHANIC 8: SPEAKING & WRITING (PDF 1 Ex D) === */}
              {exercise.kind === 'open-speaking-writing' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4">
                    <p className="font-display text-sm font-extrabold text-[#1E293B] sm:text-base">
                      {exercise.taskEnglish}
                    </p>
                    <p className="mt-1 text-xs text-[#475569]">{exercise.taskEs}</p>
                    <ul className="mt-2.5 list-disc space-y-1 pl-4 text-xs text-[#64748B]">
                      {exercise.guidingQuestionsEs.map((gq) => (
                        <li key={gq}>{gq}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-bold text-[#475569]">
                      Toca los adjetivos compuestos que quieras incluir:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.suggestedAdjectives.map((adj) => (
                        <button
                          key={adj}
                          type="button"
                          disabled={isSolved}
                          onClick={() => {
                            registerActivity();
                            updateExerciseState(exercise.id, (prev) => {
                              const curr = (prev.textInput ?? '').trim();
                              return {
                                ...prev,
                                textInput: curr ? `${curr} ${adj}` : adj,
                              };
                            });
                          }}
                          className="rounded-full border border-[#E6DEC8] bg-[#FAF7F2] px-3 py-1.5 text-xs font-bold text-[#1E293B] transition hover:border-[#D94646] hover:bg-white"
                        >
                          + {adj}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
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
                    placeholder="Redacta aquí tu descripción en inglés usando adjetivos compuestos..."
                    className="w-full rounded-2xl border-2 border-[#E6DEC8] bg-[#FAF7F2] p-4 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#D94646] focus:bg-white focus:outline-none"
                  />

                  <div className="flex flex-wrap items-center gap-2.5">
                    {!isSolved && (
                      <button
                        type="button"
                        onClick={() => submitSpeakingWriting(exercise)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#D94646] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#C23939]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Validar mi descripción</span>
                      </button>
                    )}

                    {supportsMic && (
                      <button
                        type="button"
                        onClick={() =>
                          handleMicPractice(
                            exState.textInput?.trim() || exercise.sampleParagraph
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-xs font-bold transition ${
                          micListening
                            ? 'border-[#D94646] bg-[#D94646] text-white'
                            : 'border-[#E6DEC8] bg-white text-[#1E293B] hover:border-[#2563EB]'
                        }`}
                      >
                        <Mic className="h-3.5 w-3.5" />
                        <span>
                          {micListening ? 'Escuchando...' : 'Practicar en voz alta'}
                        </span>
                      </button>
                    )}
                  </div>

                  {micFeedback && (
                    <p className="text-xs font-bold text-[#2563EB]">{micFeedback}</p>
                  )}
                </div>
              )}

              {/* === DEDICATED FEEDBACK SPACE ON EVERY EXERCISE === */}
              <div className="mt-7 rounded-3xl border border-[#ECE5D8] bg-[#FAF7F2]/85 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-[#2563EB]" />
                    <h3 className="font-display text-sm font-extrabold text-[#1E293B]">
                      Espacio de retroalimentación del ejercicio
                    </h3>
                  </div>

                  {isSolved && (
                    <button
                      type="button"
                      onClick={() => speakEnglishAudio(exercise.spokenEnglish)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#D94646] shadow-2xs transition hover:bg-[#FEF2F2]"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Escuchar frase</span>
                    </button>
                  )}
                </div>

                {/* Auto pedagogical feedback revealed once solved/attempted */}
                {(isSolved || exState.revealed) && (
                  <div className="mt-3 rounded-2xl border border-[#10B981]/35 bg-[#ECFDF5] p-3.5">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[#059669]">
                      Retroalimentación pedagógica
                    </p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-[#065F46] sm:text-sm">
                      {exercise.feedbackEs}
                    </p>
                    <p className="mt-1.5 text-[11px] font-semibold text-[#047857]">
                      Cuidado con: {exercise.commonTrapEs}
                    </p>
                    <p className="mt-2 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-[#1E293B]">
                      Modelo en inglés: &ldquo;{exercise.spokenEnglish}&rdquo;
                    </p>
                  </div>
                )}

                {/* Confidence Rating + Student/Teacher Reflection Box */}
                <div className="mt-3 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-[#64748B]">
                      ¿Cómo te sentiste en este punto?
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
                    placeholder="Espacio de retroalimentación: escribe qué aprendiste, una duda puntual o un comentario para revisión..."
                    aria-label="Espacio de retroalimentación del ejercicio"
                    className="w-full rounded-2xl border border-[#DCD3C0] bg-white p-3 text-xs leading-relaxed text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none sm:text-sm"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleAskFeedbackTutor}
                      disabled={tutorLoading}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#2563EB]/30 bg-white px-3.5 py-2 text-xs font-bold text-[#2563EB] transition hover:bg-[#EFF6FF] disabled:opacity-50"
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
                        Guía activa nivel {hintLevel}/3
                      </span>
                    )}
                  </div>

                  {exState.aiTutorReply && (
                    <div className="rounded-2xl border border-[#BFDBFE] bg-white p-3 text-xs leading-relaxed text-[#1E293B]">
                      <strong className="text-[#2563EB]">
                        Retroalimentación recibida:{' '}
                      </strong>
                      {exState.aiTutorReply}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1ECE2] pt-4">
                <button
                  type="button"
                  disabled={
                    exerciseIdx === 0 &&
                    currentSheet.sections[0].id === currentSection.id
                  }
                  onClick={movePrevExercise}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-[#E6DEC8] bg-white px-4 py-2.5 text-xs font-bold text-[#475569] transition hover:text-[#1E293B] disabled:opacity-40"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={moveNextExercise}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-[#1E293B] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0F172A] sm:text-sm"
                >
                  <span>
                    {exerciseIdx + 1 < exercises.length
                      ? 'Siguiente ejercicio'
                      : 'Siguiente parte / Resumen'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
