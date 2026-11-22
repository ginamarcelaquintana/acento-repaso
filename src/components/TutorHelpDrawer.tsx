'use client';

import React, { useState } from 'react';
import { Send, Volume2, X } from 'lucide-react';
import type { Question, Topic } from '@/types/curriculum';
import { voiceEngine } from '@/lib/voice-engine';

interface TutorMessage {
  role: 'student' | 'tutor';
  text: string;
  speakTarget?: string;
}

interface TutorHelpDrawerProps {
  isOpen: boolean;
  topic: Topic;
  currentQuestion?: Question;
  onClose: () => void;
}

export function TutorHelpDrawer({
  isOpen,
  topic,
  currentQuestion,
  onClose,
}: TutorHelpDrawerProps) {
  const [doubt, setDoubt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      role: 'tutor',
      text: `Cuéntame, ¿qué duda tienes sobre "${topic.titleEs}"? Te lo explico en segundos con un ejemplo claro.`,
    },
  ]);

  if (!isOpen) return null;

  const starterChips = [
    '¿Por qué va esa respuesta aquí?',
    'Dame otro ejemplo sencillo',
    '¿Cuál es la regla clave para no equivocarme?',
  ];

  const askTutor = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: 'student', text: trimmed }]);
    setDoubt('');
    setLoading(true);

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ask',
          topicSlug: topic.slug,
          topicTitle: topic.titleEs,
          language: topic.language,
          level: topic.level,
          questionPrompt: currentQuestion?.promptEs,
          studentDoubt: trimmed,
          currentHint: currentQuestion?.hintEs,
          currentExplanation: currentQuestion?.explanationEs,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        speakTarget?: string;
      };
      const replyText =
        data.reply ??
        currentQuestion?.explanationEs ??
        topic.microGuide[0]?.tip ??
        'Revisa la pista señalada en la tarjeta.';

      setMessages((prev) => [
        ...prev,
        { role: 'tutor', text: replyText, speakTarget: data.speakTarget },
      ]);

      voiceEngine.speak({
        text: replyText,
        mode: 'es-CO',
        targetLang: topic.language,
        muted: false,
      });
    } catch {
      const fallbackText =
        currentQuestion?.explanationEs ??
        topic.microGuide[0]?.tip ??
        'Fíjate en la concordancia entre el sujeto y el verbo.';
      setMessages((prev) => [...prev, { role: 'tutor', text: fallbackText }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-xs"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-[#ECE5D8] bg-[#FAF7F2] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ECE5D8] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/tutor-valeria.jpg"
              alt="Tutoría"
              className="h-11 w-11 rounded-2xl object-cover ring-2 ring-[#D94646]/25"
            />
            <div>
              <h2 className="font-display text-base font-extrabold text-[#1E293B]">
                Tutoría
              </h2>
              <p className="text-xs text-[#64748B]">
                {topic.language === 'en' ? 'Inglés' : 'Francés'} · {topic.level}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#E6DEC8] bg-[#FAF7F2] p-2 text-[#64748B] hover:text-[#1E293B]"
            aria-label="Cerrar tutoría"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${
                msg.role === 'student' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'student'
                    ? 'bg-[#1E293B] text-white'
                    : 'border border-[#ECE5D8] bg-white text-[#1E293B]'
                }`}
              >
                <p>{msg.text}</p>
                {msg.role === 'tutor' && (
                  <button
                    type="button"
                    aria-label="Reproducir explicación"
                    onClick={() =>
                      voiceEngine.speak({
                        text: msg.speakTarget ?? msg.text,
                        mode: msg.speakTarget
                          ? topic.language === 'en'
                            ? 'en'
                            : 'fr'
                          : 'es-CO',
                        targetLang: topic.language,
                        muted: false,
                      })
                    }
                    className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FAF7F2] text-[#D94646] transition hover:bg-[#FEF2F2]"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="inline-block rounded-2xl border border-[#ECE5D8] bg-white px-4 py-2.5 text-xs font-semibold text-[#64748B]">
              Preparando respuesta...
            </div>
          )}
        </div>

        <div className="border-t border-[#ECE5D8] bg-white p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {starterChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => askTutor(chip)}
                className="rounded-full border border-[#E6DEC8] bg-[#FAF7F2] px-3 py-1.5 text-xs font-semibold text-[#334155] transition hover:border-[#D94646]/40 hover:bg-white"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              askTutor(doubt);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={doubt}
              onChange={(e) => setDoubt(e.target.value)}
              placeholder="Escribe tu duda aquí..."
              className="flex-1 rounded-xl border border-[#E6DEC8] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!doubt.trim() || loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D94646] text-white transition hover:bg-[#C23939] disabled:opacity-45"
              aria-label="Enviar duda"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}
