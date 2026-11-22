'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Link2,
  Star,
} from 'lucide-react';
import type { Language, Level, StudyMode, Topic, UserProgress } from '@/types/curriculum';
import { searchTopics } from '@/data/curriculum';
import { buildTopicLink } from '@/lib/deep-link';
import { TopicVisual } from './TopicVisuals';

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

  const handleCopyDeepLink = async (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const url = buildTopicLink(slug, 'repaso', true);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug((curr) => (curr === slug ? null : curr)), 2200);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <section
      id="catalogo-temas"
      className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-6"
    >
      <div className="flex flex-col gap-5 rounded-3xl border border-[#ECE5D8] bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="font-display text-xl font-extrabold text-[#1E293B]">
            Temario de Inglés y Francés
          </h2>
          <span className="text-xs font-bold text-[#64748B]">
            {filteredTopics.length} {filteredTopics.length === 1 ? 'tema' : 'temas'}
          </span>
        </div>

        {/* Clean Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
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

        {/* Visual-First Minimalist Cards */}
        {filteredTopics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DCD3C0] bg-[#FAF7F2] p-10 text-center">
            <p className="font-display text-base font-bold text-[#1E293B]">
              No encontramos temas con ese filtro
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
              Ver los {allTopics.length} temas
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTopics.map((topic) => {
              const mastery = progress.topicStats[topic.slug]?.masteryPct ?? 0;
              const isFav = progress.favorites.includes(topic.slug);
              const isEn = topic.language === 'en';
              const isCopied = copiedSlug === topic.slug;

              return (
                <article
                  key={topic.slug}
                  onClick={() => onOpenTopic(topic, 'guide')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenTopic(topic, 'guide');
                    }
                  }}
                  className="group cursor-pointer overflow-hidden rounded-3xl border border-[#ECE5D8] bg-[#FAF7F2]/50 transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:bg-white hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#FAF7F2]">
                    <TopicVisual
                      topic={topic}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <span
                      className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-2xs ${
                        isEn
                          ? 'bg-[#D94646] text-white'
                          : 'bg-[#2563EB] text-white'
                      }`}
                    >
                      {isEn ? 'Inglés' : 'Francés'} ·{' '}
                      {topic.level === 'A1' ? 'Primero' : topic.level}
                    </span>

                    <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleCopyDeepLink(e, topic.slug)}
                        title="Copiar enlace directo para English TECH"
                        aria-label="Copiar enlace directo"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#475569] shadow-2xs transition hover:bg-white hover:text-[#1E293B]"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-[#059669]" />
                        ) : (
                          <Link2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavoriteTopic(topic.slug);
                        }}
                        title={isFav ? 'Quitar favorito' : 'Guardar favorito'}
                        aria-label={isFav ? 'Quitar favorito' : 'Guardar favorito'}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#475569] shadow-2xs transition hover:bg-white"
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            isFav ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#64748B]'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2.5 p-4">
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-extrabold leading-snug text-[#1E293B] sm:text-[15px]">
                        {topic.titleEs}
                      </h3>
                      {isCopied && (
                        <p className="mt-1 text-[11px] font-bold text-[#059669]">
                          Enlace copiado
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {mastery >= 75 && (
                        <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                      )}
                      <ArrowRight className="h-4 w-4 text-[#94A3B8] transition group-hover:translate-x-0.5 group-hover:text-[#1E293B]" />
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
