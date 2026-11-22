'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import type { Question, SimulacroConfig, Topic, UserProgress } from '@/types/curriculum';
import { voiceEngine } from '@/lib/voice-engine';

export interface SimulacroItem {
  topic: Topic;
  question: Question;
}

interface AnswerRecord {
  item: SimulacroItem;
  userAnswerLabel: string;
  correctAnswerLabel: string;
  isCorrect: boolean;
}

interface SimulacroSessionProps {
  config: SimulacroConfig;
  allTopics: Topic[];
  progress: UserProgress;
  onBack: () => void;
  onFinishRecord: (
    records: { topicSlug: string; questionId: string; isCorrect: boolean }[],
    xpEarned: number
  ) => void;
  onReviewMistakes: (missedQuestions: SimulacroItem[]) => void;
}

function buildQuestionPool(
  allTopics: Topic[],
  config: SimulacroConfig
): SimulacroItem[] {
  let pool: SimulacroItem[] = [];

  if (config.topicSlug) {
    const specific = allTopics.find((t) => t.slug === config.topicSlug);
    if (specific) {
      pool = specific.questions.map((question) => ({ topic: specific, question }));
    }
  }

  if (pool.length === 0) {
    const filteredTopics = allTopics.filter((t) => {
      if (config.language !== 'both' && t.language !== config.language) return false;
      if (config.level !== 'all' && t.level !== config.level) return false;
      return true;
    });
    pool = filteredTopics.flatMap((topic) =>
      topic.questions.map((question) => ({ topic, question }))
    );
  }

  // Deterministic-feeling shuffle per run
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(config.questionCount, copy.length));
}

export function SimulacroSession({
  config,
  allTopics,
  progress,
  onBack,
  onFinishRecord,
  onReviewMistakes,
}: SimulacroSessionProps) {
  const items = useMemo(() => buildQuestionPool(allTopics, config), [allTopics, config]);
  const [index, setIndex] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);

  // Per-question draft inputs
  const [choiceIdx, setChoiceIdx] = useState<number | null>(null);
  const [fillWord, setFillWord] = useState<string | null>(null);
  const [orderIndices, setOrderIndices] = useState<number[]>([]);

  // Timer
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    config.timerMinutes > 0 ? config.timerMinutes * 60 : null
  );

  useEffect(() => {
    return () => voiceEngine.stop();
  }, []);

  const finalizeExam = React.useCallback(
    (finalRecords: AnswerRecord[]) => {
      setFinished(true);
      voiceEngine.stop();
      const correctCount = finalRecords.filter((r) => r.isCorrect).length;
      const xp = correctCount * 12 + 20;
      onFinishRecord(
        finalRecords.map((r) => ({
          topicSlug: r.item.topic.slug,
          questionId: r.item.question.id,
          isCorrect: r.isCorrect,
        })),
        xp
      );
    },
    [onFinishRecord]
  );

  useEffect(() => {
    if (secondsLeft === null || finished) return;
    if (secondsLeft <= 0) {
      queueMicrotask(() => finalizeExam(records));
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s !== null ? Math.max(0, s - 1) : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft, finished, records, finalizeExam]);

  const currentItem = items[index];

  const clearInputs = () => {
    setChoiceIdx(null);
    setFillWord(null);
    setOrderIndices([]);
  };

  const canSubmit = useMemo(() => {
    if (!currentItem) return false;
    const q = currentItem.question;
    if (q.type === 'choice' || q.type === 'listen') return choiceIdx !== null;
    if (q.type === 'fill') return fillWord !== null;
    if (q.type === 'order') return orderIndices.length === q.words.length;
    return false;
  }, [currentItem, choiceIdx, fillWord, orderIndices]);

  const handleSubmitNext = () => {
    if (!currentItem || !canSubmit) return;
    const q = currentItem.question;

    let isCorrect = false;
    let userLabel = '';
    let correctLabel = '';

    if (q.type === 'choice' || q.type === 'listen') {
      isCorrect = choiceIdx === q.correctIndex;
      userLabel = q.options[choiceIdx ?? 0] ?? '';
      correctLabel = q.options[q.correctIndex] ?? '';
    } else if (q.type === 'fill') {
      isCorrect = fillWord === q.answer;
      userLabel = fillWord ?? '';
      correctLabel = q.answer;
    } else if (q.type === 'order') {
      userLabel = orderIndices.map((i) => q.words[i]).join(' ').trim();
      correctLabel = q.correctSentence;
      isCorrect = userLabel === correctLabel;
    }

    const updatedRecords = [
      ...records,
      {
        item: currentItem,
        userAnswerLabel: userLabel,
        correctAnswerLabel: correctLabel,
        isCorrect,
      },
    ];
    setRecords(updatedRecords);
    clearInputs();

    if (index + 1 < items.length) {
      setIndex((i) => i + 1);
    } else {
      finalizeExam(updatedRecords);
    }
  };

  const formatClock = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (finished) {
    const total = records.length || 1;
    const correctCount = records.filter((r) => r.isCorrect).length;
    const pct = Math.round((correctCount / total) * 100);
    const gradeFive = ((correctCount / total) * 5).toFixed(1);
    const missedItems = records
      .filter((r) => !r.isCorrect)
      .map((r) => r.item);

    // Group stats by topic
    const byTopic = new Map<
      string,
      { title: string; correct: number; total: number }
    >();
    for (const r of records) {
      const prev = byTopic.get(r.item.topic.slug) ?? {
        title: r.item.topic.titleEs,
        correct: 0,
        total: 0,
      };
      byTopic.set(r.item.topic.slug, {
        title: r.item.topic.titleEs,
        correct: prev.correct + (r.isCorrect ? 1 : 0),
        total: prev.total + 1,
      });
    }

    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="rounded-[32px] border border-[#ECE5D8] bg-white p-6 shadow-sm sm:p-8 animate-soft-pop">
          <div className="flex flex-col items-center text-center">
            <img
              src="/images/mode-simulacro.jpg"
              alt="Resultado del simulacro"
              className="h-28 w-36 rounded-2xl object-cover shadow-xs"
            />
            <span className="mt-4 rounded-full bg-[#F5F3FF] px-3 py-1 text-xs font-bold text-[#7C3AED]">
              Resultado del Simulacro
            </span>
            <h1 className="font-display mt-2 text-2xl font-extrabold text-[#1E293B] sm:text-3xl">
              Nota: {gradeFive} / 5.0
            </h1>
            <p className="mt-1 text-sm text-[#475569]">
              Respondiste correctamente {correctCount} de {total} preguntas ({pct}%)
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#FAF7F2] p-4 text-center">
              <p className="font-display text-2xl font-extrabold text-[#7C3AED]">
                {gradeFive}
              </p>
              <p className="text-xs font-semibold text-[#64748B]">
                Escala universitaria
              </p>
            </div>
            <div className="rounded-2xl bg-[#FAF7F2] p-4 text-center">
              <p className="font-display text-2xl font-extrabold text-[#059669]">
                {pct}%
              </p>
              <p className="text-xs font-semibold text-[#64748B]">
                Efectividad total
              </p>
            </div>
            <div className="rounded-2xl bg-[#FAF7F2] p-4 text-center">
              <p className="font-display text-2xl font-extrabold text-[#D97706]">
                +{correctCount * 12 + 20} XP
              </p>
              <p className="text-xs font-semibold text-[#64748B]">
                Experiencia ganada
              </p>
            </div>
          </div>

          {/* Topic Breakdown */}
          <div className="mt-6 rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2]/60 p-4 sm:p-5">
            <h2 className="font-display mb-3 text-sm font-extrabold text-[#1E293B]">
              Desempeño por tema
            </h2>
            <div className="space-y-2.5">
              {Array.from(byTopic.entries()).map(([slug, st]) => {
                const topicPct = Math.round((st.correct / st.total) * 100);
                return (
                  <div key={slug}>
                    <div className="mb-1 flex justify-between text-xs font-bold text-[#334155]">
                      <span>{st.title}</span>
                      <span>
                        {st.correct}/{st.total} ({topicPct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full rounded-full ${
                          topicPct >= 70 ? 'bg-[#059669]' : 'bg-[#F59E0B]'
                        }`}
                        style={{ width: `${Math.max(8, topicPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {missedItems.length > 0 && (
              <button
                type="button"
                onClick={() => onReviewMistakes(missedItems)}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D94646] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#C23939]"
              >
                <Sparkles className="h-4 w-4" />
                Repasar mis {missedItems.length} errores con Valeria
              </button>
            )}
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#E6DEC8] bg-white px-5 py-3 text-sm font-bold text-[#1E293B] hover:bg-[#FAF7F2]"
            >
              Volver al inicio
            </button>
          </div>

          {/* Detailed Question Review */}
          <div className="mt-8 space-y-3 border-t border-[#ECE5D8] pt-6">
            <h2 className="font-display text-base font-extrabold text-[#1E293B]">
              Revisión pregunta por pregunta
            </h2>
            {records.map((rec, rIdx) => (
              <div
                key={rec.item.question.id + rIdx}
                className={`rounded-2xl border p-4 ${
                  rec.isCorrect
                    ? 'border-[#10B981]/35 bg-[#ECFDF5]/60'
                    : 'border-[#D94646]/35 bg-[#FEF2F2]/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {rec.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#D94646]" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-[#64748B]">
                        {rec.item.topic.titleEs}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-[#1E293B]">
                        {rec.item.question.promptEs}
                      </p>
                      <p className="mt-1.5 text-xs text-[#475569]">
                        Tu respuesta:{' '}
                        <strong
                          className={
                            rec.isCorrect ? 'text-[#059669]' : 'text-[#D94646]'
                          }
                        >
                          {rec.userAnswerLabel}
                        </strong>
                        {!rec.isCorrect && (
                          <>
                            {' '}
                            · Correcta:{' '}
                            <strong className="text-[#059669]">
                              {rec.correctAnswerLabel}
                            </strong>
                          </>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {rec.item.question.explanationEs}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <p className="font-display text-lg font-bold">
          No hay preguntas disponibles para esta combinación.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-xl bg-[#1E293B] px-4 py-2 text-sm font-bold text-white"
        >
          Volver
        </button>
      </div>
    );
  }

  const q = currentItem.question;
  const isEn = currentItem.topic.language === 'en';
  const progressPct = Math.round(((index + 1) / items.length) * 100);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E6DEC8] bg-white px-3.5 py-1.5 text-xs font-bold text-[#475569] hover:text-[#1E293B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Cancelar simulacro
        </button>

        <div className="flex items-center gap-3">
          {secondsLeft !== null && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
                secondsLeft <= 60
                  ? 'bg-[#FEF2F2] text-[#D94646]'
                  : 'bg-[#F5F3FF] text-[#7C3AED]'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatClock(secondsLeft)}
            </span>
          )}
          <span className="text-xs font-bold text-[#64748B]">
            {index + 1} / {items.length}
          </span>
        </div>
      </div>

      <div className="mb-5 h-2.5 overflow-hidden rounded-full bg-[#ECE5D8]">
        <div
          className="h-full rounded-full bg-[#7C3AED] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="rounded-[28px] border border-[#ECE5D8] bg-white p-6 shadow-xs sm:p-8">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            isEn ? 'bg-[#FEF2F2] text-[#D94646]' : 'bg-[#EFF6FF] text-[#2563EB]'
          }`}
        >
          {isEn ? 'Inglés' : 'Francés'} · {currentItem.topic.level} ·{' '}
          {currentItem.topic.titleEs}
        </span>

        <h2 className="font-display mt-3 text-lg font-extrabold text-[#1E293B] sm:text-xl">
          {q.promptEs}
        </h2>

        {(q.type === 'choice' || q.type === 'listen') && (
          <div className="mt-4">
            {q.type === 'choice' && q.sentenceTarget && (
              <div className="mb-4 rounded-2xl bg-[#FAF7F2] p-4 font-display text-base font-bold text-[#1E293B]">
                {q.sentenceTarget}
              </div>
            )}
            {q.type === 'listen' && (
              <div className="mb-4 flex gap-2.5 rounded-2xl bg-[#EFF6FF] p-4">
                <button
                  type="button"
                  onClick={() =>
                    voiceEngine.speak({
                      text: q.audioText,
                      mode: isEn ? 'en' : 'fr',
                      slow: progress.voiceSlow,
                      muted: false,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-bold text-white"
                >
                  <Volume2 className="h-4 w-4" />
                  Reproducir audio
                </button>
              </div>
            )}
            <div className="grid gap-2.5 sm:grid-cols-2">
              {q.options.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setChoiceIdx(idx)}
                  className={`rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-bold transition ${
                    choiceIdx === idx
                      ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#5B21B6]'
                      : 'border-[#ECE5D8] bg-[#FAF7F2]/60 text-[#1E293B] hover:bg-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {q.type === 'fill' && (
          <div className="mt-4">
            <div className="rounded-2xl bg-[#FAF7F2] p-5 text-base font-bold text-[#1E293B]">
              {q.sentenceBefore}{' '}
              <span className="mx-1 rounded-lg border-2 border-[#7C3AED] bg-white px-3 py-0.5 text-sm text-[#6D28D9]">
                {fillWord ?? '_____'}
              </span>{' '}
              {q.sentenceAfter}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {q.wordBank.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setFillWord(w)}
                  className={`rounded-2xl border-2 px-4 py-2.5 text-sm font-bold transition ${
                    fillWord === w
                      ? 'border-[#7C3AED] bg-[#F5F3FF] text-[#5B21B6]'
                      : 'border-[#ECE5D8] bg-white text-[#1E293B]'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}

        {q.type === 'order' && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-[#64748B]">
              &ldquo;{q.spanishMeaning}&rdquo;
            </p>
            <div className="min-h-[60px] rounded-2xl border-2 border-dashed border-[#CBD5E1] bg-[#FAF7F2] p-3">
              <div className="flex flex-wrap gap-2">
                {orderIndices.map((wIdx, pos) => (
                  <button
                    key={`${wIdx}-${pos}`}
                    type="button"
                    onClick={() =>
                      setOrderIndices((prev) => prev.filter((_, i) => i !== pos))
                    }
                    className="rounded-xl border border-[#CBD5E1] bg-white px-3 py-1.5 text-sm font-bold text-[#1E293B]"
                  >
                    {q.words[wIdx]}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.words.map((word, wIdx) => {
                const used = orderIndices.includes(wIdx);
                return (
                  <button
                    key={`${word}-${wIdx}`}
                    type="button"
                    disabled={used}
                    onClick={() => setOrderIndices((prev) => [...prev, wIdx])}
                    className={`rounded-xl border-2 px-3.5 py-2 text-sm font-bold ${
                      used
                        ? 'border-transparent bg-[#F1ECE2] text-transparent'
                        : 'border-[#ECE5D8] bg-white text-[#1E293B]'
                    }`}
                  >
                    {word}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setOrderIndices([])}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E6DEC8] bg-[#FAF7F2] px-3 py-2 text-xs font-bold text-[#64748B]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Limpiar
              </button>
            </div>
          </div>
        )}

        <div className="mt-7 flex justify-end border-t border-[#F1ECE2] pt-4">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmitNext}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#7C3AED] px-6 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#6D28D9] disabled:opacity-40"
          >
            <span>
              {index + 1 < items.length ? 'Confirmar y seguir' : 'Finalizar y ver nota'}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
