'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Clock,
  Layers,
  Link2,
  Play,
  Star,
} from 'lucide-react';
import type { Language, Level, StudyMode, Topic, UserProgress } from '@/types/curriculum';
import { searchTopics } from '@/data/curriculum';
import { buildTopicLink } from '@/lib/deep-link';

interface TopicCatalogProps {
  allTopics: Topic[];
  progress: UserProgress;
  searchQuery: string;
  languageFilter: Language | 'all';
  levelFilter: Level | 'all';
  favoritesOnly: boolean;
  onLanguageChange: (lang: Language | 'all') => void;
  onLevelChange: (level: Level | 'all') => void;
  onToggleFavoritesOnly: () => void;
  onToggleFavoriteTopic: (slug: string) => void;
  onOpenTopic: (topic: Topic, mode: StudyMode) => void;
}

export function TopicCatalog({
  allTopics,
  progress,
  searchQuery,
  languageFilter,
  levelFilter,
  favoritesOnly,
  onLanguageChange,
  onLevelChange,
  onToggleFavoritesOnly,
  onToggleFavoriteTopic,
  onOpenTopic,
}: TopicCatalogProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const filteredTopics = useMemo(() => {
    const effectiveLevel = searchQuery.trim() ? 'all' : levelFilter;
    return searchTopics(searchQuery, {
      language: languageFilter,
      level: effectiveLevel,
      favoritesOnly,
      favoriteSlugs: progress.favorites,
    });
  }, [searchQuery, languageFilter, levelFilter, favoritesOnly, progress.favorites]);

  const handleCopyDeepLink = async (slug: string) => {
    const url = buildTopicLink(slug, 'repaso', true);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug((curr) => (curr === slug ? null : curr)), 2200);
    } catch {
      // Fallback ignored gracefully
    }
  };

  return (
    <section
      id="catalogo-temas"
      className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-6"
    >
      <div className="flex flex-col gap-4 rounded-3xl border border-[#ECE5D8] bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-xl font-extrabold text-[#1E293B]">
              Temario completo de Inglés y Francés
            </h2>
            <p className="mt-0.5 text-xs text-[#64748B]">
              {searchQuery.trim()
                ? `Mostrando resultados para "${searchQuery}" en todos los niveles`
                : 'Priorizamos el Nivel 1 (Primero) para construir una base firme'}
            </p>
          </div>
          <span className="text-xs font-bold text-[#64748B]">
            {filteredTopics.length} {filteredTopics.length === 1 ? 'tema' : 'temas'}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Tabs */}
          <div className="flex rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-1">
            {(
              [
                { key: 'all', label: 'Todos' },
                { key: 'en', label: 'Inglés' },
                { key: 'fr', label: 'Francés' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onLanguageChange(item.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  languageFilter === item.key
                    ? 'bg-white text-[#1E293B] shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Level Tabs */}
          <div className="flex flex-wrap rounded-2xl border border-[#ECE5D8] bg-[#FAF7F2] p-1">
            {(
              [
                { key: 'A1', label: 'Nivel 1 · Primero' },
                { key: 'A2', label: 'Nivel 2 · A2' },
                { key: 'B1', label: 'Nivel 3 · B1' },
                { key: 'all', label: 'Todos los niveles' },
              ] as const
            ).map((lvl) => (
              <button
                key={lvl.key}
                type="button"
                onClick={() => onLevelChange(lvl.key)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  levelFilter === lvl.key
                    ? 'bg-[#1E293B] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleFavoritesOnly}
            className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-bold transition ${
              favoritesOnly
                ? 'border-[#F59E0B] bg-[#FFFBEB] text-[#B45309]'
                : 'border-[#ECE5D8] bg-[#FAF7F2] text-[#64748B] hover:text-[#1E293B]'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-[#F59E0B]' : ''}`} />
            <span>Favoritos</span>
          </button>
        </div>

        {/* Topic Grid */}
        {filteredTopics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DCD3C0] bg-[#FAF7F2] p-10 text-center">
            <p className="font-display text-base font-bold text-[#1E293B]">
              No encontramos temas con ese filtro
            </p>
            <p className="mt-1 text-xs text-[#64748B]">
              Prueba otra palabra o muestra todos los niveles ({allTopics.length} temas disponibles).
            </p>
            <button
              type="button"
              onClick={() => {
                onLanguageChange('all');
                onLevelChange('all');
                if (favoritesOnly) onToggleFavoritesOnly();
              }}
              className="mt-4 rounded-xl bg-[#1E293B] px-4 py-2 text-xs font-bold text-white"
            >
              Ver todo el temario
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTopics.map((topic) => {
              const stat = progress.topicStats[topic.slug];
              const mastery = stat?.masteryPct ?? 0;
              const isFav = progress.favorites.includes(topic.slug);
              const isEn = topic.language === 'en';
              const isCopied = copiedSlug === topic.slug;

              return (
                <article
                  key={topic.slug}
                  className="flex flex-col justify-between rounded-3xl border border-[#ECE5D8] bg-[#FAF7F2]/60 p-5 transition hover:border-[#CBD5E1] hover:bg-white hover:shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            isEn
                              ? 'bg-[#FEF2F2] text-[#D94646]'
                              : 'bg-[#EFF6FF] text-[#2563EB]'
                          }`}
                        >
                          {isEn ? 'Inglés' : 'Francés'}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            topic.level === 'A1'
                              ? 'bg-[#FEF3C7] text-[#92400E]'
                              : topic.level === 'A2'
                                ? 'bg-[#ECFDF5] text-[#059669]'
                                : 'bg-[#F5F3FF] text-[#7C3AED]'
                          }`}
                        >
                          {topic.level === 'A1' ? 'Primero · A1' : topic.level}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopyDeepLink(topic.slug)}
                          title="Copiar enlace directo para English TECH"
                          className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#ECE5D8]/60 hover:text-[#1E293B]"
                        >
                          {isCopied ? (
                            <Check className="h-3.5 w-3.5 text-[#059669]" />
                          ) : (
                            <Link2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleFavoriteTopic(topic.slug)}
                          title={isFav ? 'Quitar de favoritos' : 'Guardar favorito'}
                          className="rounded-lg p-1.5 text-[#64748B] transition hover:bg-[#ECE5D8]/60"
                        >
                          <Star
                            className={`h-3.5 w-3.5 ${
                              isFav ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#94A3B8]'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {isCopied && (
                      <p className="mt-1.5 text-[11px] font-bold text-[#059669]">
                        ✓ Enlace directo copiado para English TECH
                      </p>
                    )}

                    <h3 className="font-display mt-3 text-base font-extrabold leading-snug text-[#1E293B]">
                      {topic.titleEs}
                    </h3>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#64748B]">
                      {topic.titleTarget}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#475569]">
                      {topic.shortDescEs}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#ECE5D8]">
                    <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-[#64748B]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {topic.estimatedMinutes} min · {topic.questions.length} preg.
                      </span>
                      <span
                        className={
                          mastery >= 75
                            ? 'font-bold text-[#059669]'
                            : 'font-bold text-[#475569]'
                        }
                      >
                        {mastery}% dominio
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenTopic(topic, 'guide')}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#E6DEC8] bg-white px-2.5 py-2 text-xs font-bold text-[#334155] transition hover:border-[#CBD5E1] hover:bg-[#FAF7F2]"
                        title="Ver micro-guía rápida"
                      >
                        <BookOpen className="h-3.5 w-3.5" />
                        Guía
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTopic(topic, 'tarjetas')}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#E6DEC8] bg-white px-2.5 py-2 text-xs font-bold text-[#334155] transition hover:border-[#CBD5E1] hover:bg-[#FAF7F2]"
                        title="Repasar con tarjetas"
                      >
                        <Layers className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTopic(topic, 'repaso')}
                        className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white shadow-xs transition active:translate-y-[1px] ${
                          isEn
                            ? 'bg-[#D94646] hover:bg-[#C23939]'
                            : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                        }`}
                      >
                        <Play className="h-3.5 w-3.5" />
                        Repasar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
