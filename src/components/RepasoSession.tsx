'use client';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  Mic,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { Question, Topic, UserProgress } from '@/types/curriculum';
import {
  COACHING_PROMPTS_EN,
  COACHING_PROMPTS_FR,
  PRAISE_EN,
  PRAISE_FR,
  PhraseDeck,
  SECOND_CHANCE_WINS,
  STREAK_MILESTONES,
  WELCOME_PHRASES,
  type TutorUtterance,
} from '@/data/tutor-phrases';
import { voiceEngine } from '@/lib/voice-engine';
import { PointingHandCue } from './EditorialIllustrations';
import { TutorBubble, type TutorMood } from './TutorBubble';
import { TutorHelpDrawer } from './TutorHelpDrawer';

interface RepasoSessionProps {
  topic: Topic;
  initialQuestions?: Question[];
  customTitle?: string;
  progress: UserProgress;
  nextTopic?: Topic;
  onBack: () => void;
  onRecordAnswer: (
    topicSlug: string,
    questionId: string,
    isCorrect: boolean,
    xpEarned: number
  ) => void;
  onCompleteSession: (topicSlug: string, bonusXp: number) => void;
  onOpenNextTopic: (topic: Topic) => void;
}

type QuestionStage = 'answering' | 'coaching' | 'solved';

function normalizeForComparison(value: string): string {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

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

export function RepasoSession({
  topic,
  initialQuestions,
  customTitle,
  progress,
  nextTopic,
  onBack,
  onRecordAnswer,
  onCompleteSession,
  onOpenNextTopic,
}: RepasoSessionProps) {
  const [questions, setQuestions] = useState<Question[]>(
    () => initialQuestions ?? topic.questions
  );
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<QuestionStage>('answering');
  const [attempts, setAttempts] = useState(0);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [finished, setFinished] = useState(false);

  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [selectedFill, setSelectedFill] = useState<string | null>(null);
  const [orderSelectedIndices, setOrderSelectedIndices] = useState<number[]>([]);

  const [tutorMessage, setTutorMessage] = useState<string>(
    WELCOME_PHRASES[topic.language][0].display
  );
  const [tutorMood, setTutorMood] = useState<TutorMood>('neutral');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [generatingExtra, setGeneratingExtra] = useState(false);

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
  const [micListening, setMicListening] = useState(false);
  const [micFeedback, setMicFeedback] = useState<string | null>(null);

  const praiseDeckRef = useRef(
    new PhraseDeck(topic.language === 'en' ? PRAISE_EN : PRAISE_FR)
  );
  const coachingDeckRef = useRef(
    new PhraseDeck(
      topic.language === 'en' ? COACHING_PROMPTS_EN : COACHING_PROMPTS_FR
    )
  );
  const secondWinDeckRef = useRef(new PhraseDeck(SECOND_CHANCE_WINS));
  const welcomeDeckRef = useRef(new PhraseDeck(WELCOME_PHRASES[topic.language]));
  const milestoneDeckRef = useRef(new PhraseDeck(STREAK_MILESTONES));

  const currentQuestion = questions[index];
  const isEn = topic.language === 'en';
  const targetVoiceMode = isEn ? 'en' : 'fr';

  useEffect(() => {
    praiseDeckRef.current = new PhraseDeck(isEn ? PRAISE_EN : PRAISE_FR);
    coachingDeckRef.current = new PhraseDeck(
      isEn ? COACHING_PROMPTS_EN : COACHING_PROMPTS_FR
    );
    welcomeDeckRef.current = new PhraseDeck(WELCOME_PHRASES[topic.language]);

    const intro = welcomeDeckRef.current.next();
    queueMicrotask(() => {
      setTutorMessage(intro.display);
      setTutorMood('neutral');
    });

    if (!progress.voiceMuted) {
      const firstQ = questions[0];
      voiceEngine.speak({
        text: intro.speakText,
        mode: intro.voiceMode,
        targetLang: topic.language,
        muted: progress.voiceMuted,
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          if (firstQ?.type === 'listen') {
            voiceEngine.speak({
              text: firstQ.audioText,
              mode: targetVoiceMode,
              targetLang: topic.language,
              muted: false,
              onStart: () => setIsSpeaking(true),
              onEnd: () => setIsSpeaking(false),
            });
          }
        },
      });
    }

    return () => {
      voiceEngine.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.slug]);

  const speakUtterance = (utterance: TutorUtterance, followUpTarget?: string) => {
    setTutorMessage(utterance.display);

    if (progress.voiceMuted) return;

    voiceEngine.speak({
      text: utterance.speakText,
      mode: utterance.voiceMode,
      targetLang: topic.language,
      muted: progress.voiceMuted,
      onStart: () => setIsSpeaking(true),
      onEnd: () => {
        setIsSpeaking(false);
        if (followUpTarget) {
          voiceEngine.speak({
            text: followUpTarget,
            mode: targetVoiceMode,
            targetLang: topic.language,
            muted: progress.voiceMuted,
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false),
          });
        }
      },
    });
  };

  const speakTargetAudio = (text: string) => {
    voiceEngine.speak({
      text,
      mode: targetVoiceMode,
      targetLang: topic.language,
      muted: false,
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
    });
  };

  const resetQuestionInputs = () => {
    setSelectedChoice(null);
    setSelectedFill(null);
    setOrderSelectedIndices([]);
    setMicFeedback(null);
  };

  const evaluateAnswer = (isCorrect: boolean) => {
    if (!currentQuestion || stage === 'solved') return;

    if (isCorrect) {
      const firstTry = attempts === 0;
      const earned = firstTry ? 15 : 10;
      const nextCombo = comboStreak + 1;

      setStage('solved');
      setWasCorrect(true);
      setSessionScore((s) => s + 1);
      setComboStreak(nextCombo);
      setTutorMood('praise');

      onRecordAnswer(topic.slug, currentQuestion.id, true, earned);

      const praise = firstTry
        ? nextCombo > 0 && nextCombo % 3 === 0
          ? milestoneDeckRef.current.next()
          : praiseDeckRef.current.next()
        : secondWinDeckRef.current.next();

      speakUtterance(praise, currentQuestion.spokenAnswerTarget);
      return;
    }

    if (attempts === 0) {
      setAttempts(1);
      setStage('coaching');
      if (currentQuestion.type === 'order') {
        setOrderSelectedIndices([]);
      }
      setComboStreak(0);
      setTutorMood('coaching');
      const coach = coachingDeckRef.current.next();
      speakUtterance(coach);
    } else {
      setAttempts(2);
      setStage('solved');
      setWasCorrect(false);
      setComboStreak(0);
      setTutorMood('neutral');
      onRecordAnswer(topic.slug, currentQuestion.id, false, 2);

      const gentleCorrection: TutorUtterance = {
        display: `Tranquilo, mira cómo era: ${currentQuestion.explanationEs}`,
        speakText: `Tranquilo, mira esta clave: ${currentQuestion.explanationEs}`,
        voiceMode: 'es-CO',
      };
      speakUtterance(gentleCorrection, currentQuestion.spokenAnswerTarget);
    }
  };

  const handleChoiceSelect = (optionIdx: number) => {
    if (stage === 'solved' || !currentQuestion) return;
    if (currentQuestion.type !== 'choice' && currentQuestion.type !== 'listen') {
      return;
    }
    setSelectedChoice(optionIdx);
    evaluateAnswer(optionIdx === currentQuestion.correctIndex);
  };

  const handleFillSelect = (word: string) => {
    if (stage === 'solved' || !currentQuestion || currentQuestion.type !== 'fill') {
      return;
    }
    setSelectedFill(word);
    evaluateAnswer(
      normalizeForComparison(word) ===
        normalizeForComparison(currentQuestion.answer)
    );
  };

  const handleCheckOrder = () => {
    if (stage === 'solved' || !currentQuestion || currentQuestion.type !== 'order') {
      return;
    }
    const built = orderSelectedIndices
      .map((i) => currentQuestion.words[i])
      .join(' ')
      .trim();
    evaluateAnswer(
      normalizeForComparison(built) ===
        normalizeForComparison(currentQuestion.correctSentence)
    );
  };

  const handleManualHint = () => {
    if (!currentQuestion) return;
    setTutorMood('coaching');
    const coach = coachingDeckRef.current.next();
    speakUtterance(coach);
    if (stage === 'answering') {
      setStage('coaching');
    }
  };

  const handleNextQuestion = () => {
    voiceEngine.stop();
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setStage('answering');
      setAttempts(0);
      setWasCorrect(null);
      setTutorMood('neutral');
      resetQuestionInputs();

      const nextQ = questions[index + 1];
      if (nextQ?.type === 'listen' && !progress.voiceMuted) {
        setTimeout(() => {
          speakTargetAudio(nextQ.audioText);
        }, 250);
      }
    } else {
      setFinished(true);
      onCompleteSession(topic.slug, 25);
      const winMsg: TutorUtterance = {
        display: '¡Felicitaciones! Terminaste todo este repaso con súper buena actitud.',
        speakText: '¡Felicitaciones! Terminaste todo este repaso con súper buena actitud.',
        voiceMode: 'es-CO',
      };
      setTutorMood('celebration');
      speakUtterance(winMsg);
    }
  };

  const handleGenerateMoreQuestions = async () => {
    if (generatingExtra) return;
    setGeneratingExtra(true);
    try {
      const grammarSummary = topic.microGuide
        .map((g) => `${g.title}: ${g.formula ?? ''} ${g.tip}`)
        .join(' | ');
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_questions',
          topicSlug: topic.slug,
          topicTitle: topic.titleEs,
          language: topic.language,
          level: topic.level,
          grammarSummary: grammarSummary.slice(0, 1400),
        }),
      });
      const data = (await res.json()) as { questions?: Question[] };
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        setQuestions(data.questions);
        setIndex(0);
        setFinished(false);
        setStage('answering');
        setAttempts(0);
        setWasCorrect(null);
        resetQuestionInputs();
      }
    } finally {
      setGeneratingExtra(false);
    }
  };

  const handlePracticeMic = (expectedPhrase: string) => {
    const win = window as unknown as {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec || micListening) return;

    const rec = new SpeechRec();
    rec.lang = isEn ? 'en-US' : 'fr-FR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setMicListening(true);
    setMicFeedback('Escuchando tu pronunciación...');

    rec.onresult = (event) => {
      const spoken = event.results?.[0]?.[0]?.transcript ?? '';
      const norm = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w\s]/g, '')
          .trim();
      const targetWords = norm(expectedPhrase).split(/\s+/).filter(Boolean);
      const spokenWords = norm(spoken).split(/\s+/).filter(Boolean);
      const hits = targetWords.filter((w) => spokenWords.includes(w)).length;
      const ratio = targetWords.length > 0 ? hits / targetWords.length : 0;

      if (ratio >= 0.65) {
        setMicFeedback(`¡Qué bien suena! ("${spoken}")`);
      } else {
        setMicFeedback(`Escuché "${spoken}". Prueba repetirla con calma.`);
      }
    };
    rec.onerror = () => {
      setMicFeedback('No capté el micrófono, intenta otra vez cerca del equipo.');
      setMicListening(false);
    };
    rec.onend = () => setMicListening(false);
    rec.start();
  };

  const progressPct = useMemo(
    () => Math.round(((index + (stage === 'solved' ? 1 : 0)) / questions.length) * 100),
    [index, questions.length, stage]
  );

  if (finished) {
    const accuracy = Math.round((sessionScore / questions.length) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="rounded-[32px] border border-[#ECE5D8] bg-white p-6 text-center shadow-sm sm:p-10 animate-soft-pop">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#ECFDF5] ring-4 ring-[#ECFDF5]/60">
            <CheckCircle2 className="h-11 w-11 text-[#059669]" />
          </div>
          <span className="mt-4 inline-block rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#059669]">
            Sesión completada
          </span>
          <h1 className="font-display mt-3 text-2xl font-extrabold text-[#1E293B] sm:text-3xl">
            {accuracy >= 80
              ? '¡Lo hiciste espectacular!'
              : '¡Buen repaso, así se afianza!'}
          </h1>
          <p className="mt-2 text-sm text-[#475569]">
            {customTitle ?? topic.titleEs}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#FAF7F2] p-4">
              <p className="font-display text-2xl font-extrabold text-[#059669]">
                {sessionScore}/{questions.length}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                Aciertos
              </p>
            </div>
            <div className="rounded-2xl bg-[#FAF7F2] p-4">
              <p className="font-display text-2xl font-extrabold text-[#D94646]">
                {accuracy}%
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#64748B]">
                Precisión
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleGenerateMoreQuestions}
              disabled={generatingExtra}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E6DEC8] bg-[#FAF7F2] px-5 py-3 text-sm font-bold text-[#1E293B] transition hover:bg-[#F2ECE0]"
            >
              <Sparkles className="h-4 w-4 text-[#D97706]" />
              {generatingExtra
                ? 'Preparando 3 nuevas...'
                : 'Practicar 3 preguntas nuevas'}
            </button>

            {nextTopic ? (
              <button
                type="button"
                onClick={() => onOpenNextTopic(nextTopic)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1E293B] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0F172A]"
              >
                <span>Siguiente: {nextTopic.titleEs}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1E293B] px-5 py-3 text-sm font-bold text-white"
              >
                Volver al catálogo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DEC8] bg-white px-3.5 py-1.5 text-xs font-bold text-[#475569] hover:text-[#1E293B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Salir del repaso
        </button>

        <span className="text-xs font-bold text-[#64748B]">
          Pregunta {index + 1} de {questions.length}
        </span>
      </div>

      <div className="mb-5 h-2.5 overflow-hidden rounded-full bg-[#ECE5D8]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isEn ? 'bg-[#D94646]' : 'bg-[#2563EB]'
          }`}
          style={{ width: `${Math.max(8, progressPct)}%` }}
        />
      </div>

      <TutorBubble
        message={tutorMessage}
        mood={tutorMood}
        isSpeaking={isSpeaking}
        clueLabel={stage === 'coaching' ? currentQuestion.hintEs : undefined}
      />

      <div className="mt-5 rounded-[28px] border border-[#ECE5D8] bg-white p-5 shadow-xs sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              isEn
                ? 'bg-[#FEF2F2] text-[#D94646]'
                : 'bg-[#EFF6FF] text-[#2563EB]'
            }`}
          >
            {customTitle ?? `${topic.titleEs} · ${topic.level}`}
          </span>

          <button
            type="button"
            onClick={handleManualHint}
            className="inline-flex items-center gap-1 rounded-full border border-[#F59E0B]/40 bg-[#FFFBEB] px-3 py-1 text-xs font-bold text-[#92400E] transition hover:bg-[#FEF3C7]"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Pista
          </button>
        </div>

        <h2 className="font-display mt-4 text-lg font-extrabold leading-snug text-[#1E293B] sm:text-xl">
          {currentQuestion.promptEs}
        </h2>

        {(currentQuestion.type === 'choice' || currentQuestion.type === 'listen') && (
          <div className="mt-4">
            {currentQuestion.type === 'choice' && currentQuestion.sentenceTarget && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-4">
                <p className="font-display text-base font-bold text-[#1E293B] sm:text-lg">
                  {currentQuestion.sentenceTarget}
                </p>
                {currentQuestion.audioText && (
                  <button
                    type="button"
                    onClick={() => speakTargetAudio(currentQuestion.audioText!)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#D94646] shadow-xs"
                    aria-label="Pronunciar frase"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {currentQuestion.type === 'listen' && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#2563EB]/25 bg-[#EFF6FF]/60 p-4">
                <button
                  type="button"
                  onClick={() => speakTargetAudio(currentQuestion.audioText)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#1D4ED8] active:translate-y-[1px]"
                >
                  <Volume2 className="h-4 w-4" />
                  Reproducir audio
                </button>
                {stage === 'solved' && (
                  <p className="w-full text-xs font-semibold text-[#1E293B]">
                    Transcripción: &ldquo;{currentQuestion.transcript}&rdquo;
                  </p>
                )}
              </div>
            )}

            {stage === 'coaching' &&
              currentQuestion.type === 'choice' &&
              currentQuestion.clueHighlight && (
                <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-[#F59E0B]/50 bg-[#FFFBEB] px-3.5 py-2.5 animate-soft-pop">
                  <span className="shrink-0 animate-point-nudge">
                    <PointingHandCue className="h-7 w-7" />
                  </span>
                  <span className="text-xs font-bold text-[#92400E]">
                    Clave señalada: {currentQuestion.clueHighlight}
                  </span>
                </div>
              )}

            <div className="grid gap-2.5 sm:grid-cols-2">
              {currentQuestion.options.map((opt, optIdx) => {
                const isSelected = selectedChoice === optIdx;
                const isRightOption = optIdx === currentQuestion.correctIndex;

                let btnStyle =
                  'border-[#ECE5D8] bg-[#FAF7F2]/60 text-[#1E293B] hover:border-[#CBD5E1] hover:bg-white';

                if (stage === 'solved') {
                  if (isRightOption) {
                    btnStyle = 'border-[#059669] bg-[#ECFDF5] text-[#065F46]';
                  } else if (isSelected && !isRightOption) {
                    btnStyle = 'border-[#D94646] bg-[#FEF2F2] text-[#991B1B]';
                  } else {
                    btnStyle = 'border-[#ECE5D8] bg-[#FAF7F2]/40 text-[#94A3B8]';
                  }
                } else if (stage === 'coaching' && isSelected) {
                  btnStyle = 'border-[#F59E0B] bg-[#FFFBEB] text-[#92400E] opacity-75';
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={stage === 'solved'}
                    onClick={() => handleChoiceSelect(optIdx)}
                    className={`flex items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-bold transition active:translate-y-[1px] ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {stage === 'solved' && isRightOption && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#059669]" />
                    )}
                    {stage === 'solved' && isSelected && !isRightOption && (
                      <XCircle className="h-4 w-4 shrink-0 text-[#D94646]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentQuestion.type === 'fill' && (
          <div className="mt-4">
            <div className="rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-5 text-base font-bold leading-relaxed text-[#1E293B] sm:text-lg">
              {currentQuestion.sentenceBefore}{' '}
              <span
                className={`mx-1 inline-flex min-w-[92px] items-center justify-center rounded-xl border-2 px-3 py-0.5 text-sm font-extrabold ${
                  stage === 'solved'
                    ? 'border-[#059669] bg-[#ECFDF5] text-[#065F46]'
                    : selectedFill
                      ? 'border-[#F59E0B] bg-[#FFFBEB] text-[#92400E]'
                      : 'border-dashed border-[#94A3B8] bg-white text-[#94A3B8]'
                }`}
              >
                {stage === 'solved'
                  ? currentQuestion.answer
                  : selectedFill ?? '_____'}
              </span>{' '}
              {currentQuestion.sentenceAfter}
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {currentQuestion.wordBank.map((word) => {
                const isPicked = selectedFill === word;
                const isAnswer = word === currentQuestion.answer;

                let chipStyle =
                  'border-[#E6DEC8] bg-white text-[#1E293B] hover:border-[#2563EB] hover:bg-[#EFF6FF]/40';
                if (stage === 'solved') {
                  if (isAnswer) chipStyle = 'border-[#059669] bg-[#ECFDF5] text-[#065F46]';
                  else if (isPicked) chipStyle = 'border-[#D94646] bg-[#FEF2F2] text-[#991B1B]';
                  else chipStyle = 'border-[#ECE5D8] bg-[#FAF7F2] text-[#94A3B8]';
                } else if (stage === 'coaching' && isPicked) {
                  chipStyle = 'border-[#F59E0B] bg-[#FFFBEB] text-[#92400E] opacity-75';
                }

                return (
                  <button
                    key={word}
                    type="button"
                    disabled={stage === 'solved'}
                    onClick={() => handleFillSelect(word)}
                    className={`rounded-2xl border-2 px-4 py-2.5 text-sm font-bold transition active:translate-y-[1px] ${chipStyle}`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {currentQuestion.type === 'order' && (
          <div className="mt-4">
            <p className="mb-3 text-xs font-semibold text-[#64748B]">
              Significado: &ldquo;{currentQuestion.spanishMeaning}&rdquo;
            </p>

            <div className="min-h-[68px] rounded-2xl border-2 border-dashed border-[#D4CBB8] bg-[#FAF7F2] p-3.5">
              {orderSelectedIndices.length === 0 ? (
                <p className="text-xs font-medium text-[#94A3B8]">
                  Toca las palabras en orden para armar la frase...
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {orderSelectedIndices.map((wordIdx, pos) => (
                    <button
                      key={`${wordIdx}-${pos}`}
                      type="button"
                      disabled={stage === 'solved'}
                      onClick={() =>
                        setOrderSelectedIndices((prev) =>
                          prev.filter((_, i) => i !== pos)
                        )
                      }
                      className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-bold text-[#1E293B] shadow-2xs transition hover:border-[#D94646]"
                    >
                      {currentQuestion.words[wordIdx]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2">
              {currentQuestion.words.map((word, wIdx) => {
                const used = orderSelectedIndices.includes(wIdx);
                return (
                  <button
                    key={`${word}-${wIdx}`}
                    type="button"
                    disabled={used || stage === 'solved'}
                    onClick={() =>
                      setOrderSelectedIndices((prev) => [...prev, wIdx])
                    }
                    className={`rounded-xl border-2 px-3.5 py-2 text-sm font-bold transition ${
                      used
                        ? 'border-transparent bg-[#F1ECE2] text-transparent select-none'
                        : 'border-[#E6DEC8] bg-white text-[#1E293B] hover:border-[#2563EB]'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
            </div>

            {stage !== 'solved' && (
              <div className="mt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setOrderSelectedIndices([])}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DEC8] bg-[#FAF7F2] px-3.5 py-2.5 text-xs font-bold text-[#64748B] hover:text-[#1E293B]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Limpiar
                </button>
                <button
                  type="button"
                  disabled={
                    orderSelectedIndices.length !== currentQuestion.words.length
                  }
                  onClick={handleCheckOrder}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition disabled:opacity-45 ${
                    isEn
                      ? 'bg-[#D94646] hover:bg-[#C23939]'
                      : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                  }`}
                >
                  Comprobar frase
                </button>
              </div>
            )}
          </div>
        )}

        {stage === 'solved' && (
          <div
            className={`mt-5 rounded-2xl border p-4 animate-soft-pop ${
              wasCorrect
                ? 'border-[#10B981]/45 bg-[#ECFDF5]'
                : 'border-[#E2D9C8] bg-[#FAF7F2]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider ${
                  wasCorrect ? 'text-[#059669]' : 'text-[#B45309]'
                }`}
              >
                {wasCorrect ? '✓ Respuesta lograda' : 'Para recordar'}
              </span>
              {supportsMic && (
                <button
                  type="button"
                  onClick={() =>
                    handlePracticeMic(currentQuestion.spokenAnswerTarget)
                  }
                  className={`inline-flex items-center gap-1 rounded-xl px-3 py-1 text-xs font-bold shadow-2xs ${
                    micListening
                      ? 'bg-[#D94646] text-white'
                      : 'bg-white text-[#475569] hover:text-[#1E293B]'
                  }`}
                >
                  <Mic className="h-3.5 w-3.5" />
                  {micListening ? 'Habla...' : 'Pronunciar'}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => speakTargetAudio(currentQuestion.spokenAnswerTarget)}
              className="mt-2 flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-left text-sm font-bold text-[#1E293B] transition hover:bg-white hover:text-[#D94646]"
              title="Reproducir pronunciación"
            >
              <Volume2 className="h-4 w-4 shrink-0 text-[#D94646]" />
              <span>{currentQuestion.spokenAnswerTarget}</span>
            </button>

            <p className="mt-2 text-xs leading-relaxed text-[#475569]">
              {currentQuestion.explanationEs}
            </p>
            {micFeedback && (
              <p className="mt-2 text-xs font-bold text-[#2563EB]">
                {micFeedback}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#F1ECE2] pt-4">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#E6DEC8] bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#334155] transition hover:border-[#D94646]/40 hover:bg-white"
          >
            <MessageCircle className="h-4 w-4 text-[#D94646]" />
            <span>Tutoría</span>
          </button>

          {stage === 'solved' && (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#1E293B] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#0F172A] active:translate-y-[1px]"
            >
              <span>
                {index + 1 < questions.length
                  ? 'Siguiente pregunta'
                  : 'Ver resumen'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <TutorHelpDrawer
        isOpen={helpOpen}
        topic={topic}
        currentQuestion={currentQuestion}
        onClose={() => setHelpOpen(false)}
      />
    </div>
  );
}
