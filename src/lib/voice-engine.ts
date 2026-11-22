import type { Language, VoiceMode } from '@/types/curriculum';

export interface SpeakOptions {
  text: string;
  mode: VoiceMode;
  targetLang?: Language;
  slow?: boolean;
  muted?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

interface SpeechSegment {
  text: string;
  lang: 'es-CO' | 'en-US' | 'fr-FR';
}

const FALLBACK_COOLDOWN_MS = 3000;

export function sanitizeForSpeech(raw: string, targetLang?: Language): string {
  const targetTag = targetLang === 'fr' ? 'fr' : 'en';

  return (
    raw
      // Remove emojis, checkmarks, crosses, decorative bullets
      .replace(/[✓✗✔✕👉🔥✨⭐]/gu, '')
      .replace(/[«»[\]()]/g, ' ')
      // Fill blanks -> smooth pause, never read "guión bajo"
      .replace(/_{2,}/g, ', ')
      // Grammar suffix conversions so hyphens are never read as "guion"
      .replace(/(?:^|\s)-ing\b/gi, ` {${targetTag}:I N G}`)
      .replace(/(?:^|\s)-ed\b/gi, ` {${targetTag}:E D}`)
      .replace(/(?:^|\s)-ies\b/gi, ' i e ese')
      .replace(/(?:^|\s)-es\b/gi, ' e ese')
      .replace(/(?:^|\s)-s\b/gi, ' ese')
      .replace(/(?:^|\s)-ER\b/g, ' {fr:E R}')
      .replace(/(?:^|\s)-ir\b/gi, ' {fr:I R}')
      .replace(/(?:^|\s)-tion\b/gi, ' {fr:tion}')
      .replace(/(?:^|\s)-sion\b/gi, ' {fr:sion}')
      .replace(/(?:^|\s)-eau\b/gi, ' {fr:eau}')
      .replace(/(?:^|\s)-age\b/gi, ' {fr:age}')
      .replace(/(?:^|\s)-ment\b/gi, ' {fr:ment}')
      .replace(/(?:^|\s)-ent\b/gi, ' {fr:E N T}')
      .replace(/(?:^|\s)-ger\b/gi, ' {fr:G E R}')
      // Replace arrows, slashes, mid-dots, pipes, dashes with natural spoken connectors/pauses
      .replace(/→/g, ', pasa a ')
      .replace(/\s*\/\s*/g, ' o ')
      .replace(/[—–·|]/g, ', ')
      .replace(/\.\.\./g, ', ')
      .replace(/\s+-\s+/g, ', ')
      .replace(/^-+|-+$/g, '')
      // Clean leftover quotation marks/spaces cleanly after auto-segmentation happens
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

function autoSegmentBilingualText(
  sanitized: string,
  mode: VoiceMode,
  targetLang?: Language
): string {
  if (mode === 'en' || mode === 'fr') return sanitized;
  if (/\{(?:en|fr):/.test(sanitized)) return sanitized;

  const langTag =
    targetLang === 'fr' || mode === 'mixed-fr'
      ? 'fr'
      : targetLang === 'en' || mode === 'mixed-en'
        ? 'en'
        : null;

  if (!langTag) return sanitized;

  // Wrap quoted English/French examples inside Spanish explanations so each switches accent authentically
  return sanitized.replace(/["“]([^"”]{2,120})["”]/g, (_, inner: string) => {
    const cleanInner = inner.trim();
    if (!cleanInner) return '';
    return `{${langTag}:${cleanInner}}`;
  });
}

function stripTagsAndQuotes(text: string): string {
  return text
    .replace(/\{(?:en|fr):([^}]+)\}/g, '$1')
    .replace(/["“”]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseSegments(
  rawText: string,
  mode: VoiceMode,
  targetLang?: Language
): SpeechSegment[] {
  const sanitized = sanitizeForSpeech(rawText, targetLang);

  if (mode === 'es-CO' && !targetLang) {
    return [{ text: stripTagsAndQuotes(sanitized), lang: 'es-CO' }];
  }
  if (mode === 'en') {
    return [{ text: stripTagsAndQuotes(sanitized), lang: 'en-US' }];
  }
  if (mode === 'fr') {
    return [{ text: stripTagsAndQuotes(sanitized), lang: 'fr-FR' }];
  }

  const segmented = autoSegmentBilingualText(sanitized, mode, targetLang);
  const segments: SpeechSegment[] = [];
  const regex = /\{(en|fr):([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(segmented)) !== null) {
    if (match.index > lastIndex) {
      const before = stripTagsAndQuotes(segmented.slice(lastIndex, match.index));
      if (before) segments.push({ text: before, lang: 'es-CO' });
    }
    const segLang = match[1] === 'en' ? 'en-US' : 'fr-FR';
    const segText = stripTagsAndQuotes(match[2]);
    if (segText) segments.push({ text: segText, lang: segLang });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < segmented.length) {
    const rest = stripTagsAndQuotes(segmented.slice(lastIndex));
    if (rest) segments.push({ text: rest, lang: 'es-CO' });
  }

  return segments.length > 0
    ? segments
    : [{ text: stripTagsAndQuotes(sanitized), lang: 'es-CO' }];
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  targetLang: 'es-CO' | 'en-US' | 'fr-FR'
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const preferredPatterns: Record<'es-CO' | 'en-US' | 'fr-FR', string[]> = {
    'es-CO': [
      'salome',
      'salomé',
      'soledad',
      'es-co',
      'colombia',
      'google español',
      'dalia',
      'paulina',
      'monica',
      'es-mx',
      'es-us',
      'es-es',
    ],
    'en-US': [
      'avamultilingual',
      'jenny',
      'aria',
      'michelle',
      'google us english',
      'samantha',
      'libby',
      'en-us',
      'en-gb',
    ],
    'fr-FR': [
      'viviennemultilingual',
      'denise',
      'brigitte',
      'celine',
      'google français',
      'amélie',
      'amelie',
      'julie',
      'fr-fr',
      'fr-ca',
    ],
  };

  const langPrefix = targetLang.slice(0, 2);
  const candidates = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix)
  );
  const pool = candidates.length > 0 ? candidates : voices;
  const patterns = preferredPatterns[targetLang];

  let bestVoice: SpeechSynthesisVoice | null = null;
  let bestScore = -9999;

  for (const voice of pool) {
    const hay = `${voice.name} ${voice.lang}`.toLowerCase();
    let score = 0;

    // Strongly prioritize cloud/neural human voices over offline robotic Windows SAPI5 voices
    if (voice.localService === false) score += 120;
    if (hay.includes('natural') || hay.includes('neural') || hay.includes('online')) {
      score += 110;
    }
    if (hay.includes('google')) score += 70;
    if (hay.includes('microsoft') && !voice.localService) score += 60;

    // Penalize older offline Windows SAPI5 robotic synthesizers
    if (
      voice.localService &&
      /\b(sabina|helena|zira|hortense|david|mark|paul|laura|raul|george|hazel|richard)\b/.test(
        hay
      )
    ) {
      score -= 80;
    }

    if (
      hay.includes('female') ||
      !/\b(male|david|mark|george|pablo|henri|paul|thomas|raul|gonzalo)\b/.test(
        hay
      )
    ) {
      score += 16;
    }

    for (let i = 0; i < patterns.length; i++) {
      if (hay.includes(patterns[i])) {
        score += (patterns.length - i) * 6;
        break;
      }
    }

    if (voice.lang.toLowerCase() === targetLang.toLowerCase()) {
      score += 35;
    }

    if (score > bestScore) {
      bestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice;
}

class VoiceEngineController {
  private readonly blobCache = new Map<string, string>();
  private currentAudio: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private speaking = false;
  private apiCooldownUntil = 0;
  private activeRunId = 0;
  private activeCallbacks: { onStart?: () => void; onEnd?: () => void } = {};

  isSpeaking(): boolean {
    return this.speaking;
  }

  stop(): void {
    this.activeRunId++;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.speaking) {
      this.speaking = false;
      this.activeCallbacks.onEnd?.();
    }
    this.activeCallbacks = {};
  }

  async speak(options: SpeakOptions): Promise<void> {
    if (typeof window === 'undefined') return;
    if (options.muted || !options.text.trim()) {
      options.onEnd?.();
      return;
    }

    this.stop();
    const runId = ++this.activeRunId;
    this.activeCallbacks = { onStart: options.onStart, onEnd: options.onEnd };

    const slow = Boolean(options.slow);
    const effectiveMode: VoiceMode =
      options.mode === 'es-CO' && options.targetLang
        ? options.targetLang === 'fr'
          ? 'mixed-fr'
          : 'mixed-en'
        : options.mode;

    const segmentedForApi = autoSegmentBilingualText(
      sanitizeForSpeech(options.text, options.targetLang),
      effectiveMode,
      options.targetLang
    );
    const strippedCheck = stripTagsAndQuotes(segmentedForApi);
    if (!strippedCheck) {
      options.onEnd?.();
      return;
    }

    const payloadText =
      segmentedForApi.length <= 680
        ? segmentedForApi
        : strippedCheck.slice(0, 680);

    const cacheKey = `${effectiveMode}:${slow ? 's' : 'n'}:${payloadText}`;
    const cachedUrl = this.blobCache.get(cacheKey);

    if (cachedUrl) {
      await this.playAudioUrl(cachedUrl, runId, options);
      return;
    }

    const now = Date.now();
    if (now >= this.apiCooldownUntil) {
      const controller = new AbortController();
      this.abortController = controller;

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: payloadText,
            mode: effectiveMode,
            slow,
          }),
          signal: controller.signal,
        });

        if (runId !== this.activeRunId) return;

        const contentType = res.headers.get('content-type') ?? '';
        if (res.ok && contentType.includes('audio/')) {
          const blob = await res.blob();
          if (blob.size > 0 && runId === this.activeRunId) {
            const url = URL.createObjectURL(blob);
            this.blobCache.set(cacheKey, url);
            await this.playAudioUrl(url, runId, options);
            return;
          }
        } else if (!res.ok) {
          this.apiCooldownUntil = Date.now() + FALLBACK_COOLDOWN_MS;
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError' || runId !== this.activeRunId) {
          return;
        }
        this.apiCooldownUntil = Date.now() + FALLBACK_COOLDOWN_MS;
      }
    }

    if (runId !== this.activeRunId) return;
    this.speakWithBrowser(
      options.text,
      options.mode,
      options.targetLang,
      slow,
      runId,
      options
    );
  }

  private async playAudioUrl(
    url: string,
    runId: number,
    options: SpeakOptions
  ): Promise<void> {
    if (runId !== this.activeRunId) return;

    const audio = new Audio(url);
    audio.playbackRate = options.slow ? 0.85 : 1.0;
    this.currentAudio = audio;
    this.speaking = true;
    options.onStart?.();

    const finish = () => {
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
      if (runId === this.activeRunId) {
        this.speaking = false;
        options.onEnd?.();
      }
    };

    audio.onended = finish;
    audio.onerror = () => {
      finish();
      if (runId === this.activeRunId) {
        this.speakWithBrowser(
          options.text,
          options.mode,
          options.targetLang,
          Boolean(options.slow),
          runId,
          options
        );
      }
    };

    try {
      await audio.play();
    } catch (err) {
      finish();
      const isAutoplayBlocked =
        (err as { name?: string })?.name === 'NotAllowedError';
      if (!isAutoplayBlocked && runId === this.activeRunId) {
        this.speakWithBrowser(
          options.text,
          options.mode,
          options.targetLang,
          Boolean(options.slow),
          runId,
          options
        );
      }
    }
  }

  private speakWithBrowser(
    text: string,
    mode: VoiceMode,
    targetLang: Language | undefined,
    slow: boolean,
    runId: number,
    options: SpeakOptions
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.speaking = false;
      options.onEnd?.();
      return;
    }

    const synth = window.speechSynthesis;
    const segments = parseSegments(text, mode, targetLang);

    const runSegments = () => {
      if (runId !== this.activeRunId) return;
      const voices = synth.getVoices();
      this.speaking = true;
      options.onStart?.();

      let index = 0;
      const speakNext = () => {
        if (runId !== this.activeRunId) return;
        if (index >= segments.length) {
          this.speaking = false;
          options.onEnd?.();
          return;
        }

        const seg = segments[index++];
        const utterance = new SpeechSynthesisUtterance(seg.text);
        utterance.lang = seg.lang;
        const matched = pickBestVoice(voices, seg.lang);
        if (matched) utterance.voice = matched;
        utterance.rate = slow ? 0.78 : seg.lang === 'es-CO' ? 0.96 : 0.9;
        utterance.pitch = 1.0;

        utterance.onend = () => speakNext();
        utterance.onerror = () => speakNext();
        synth.speak(utterance);
      };

      speakNext();
    };

    if (synth.getVoices().length > 0) {
      runSegments();
    } else {
      const handleVoices = () => {
        synth.removeEventListener('voiceschanged', handleVoices);
        runSegments();
      };
      synth.addEventListener('voiceschanged', handleVoices);
      setTimeout(() => {
        synth.removeEventListener('voiceschanged', handleVoices);
        if (runId === this.activeRunId && !this.speaking) {
          runSegments();
        }
      }, 300);
    }
  }
}

export const voiceEngine = new VoiceEngineController();
