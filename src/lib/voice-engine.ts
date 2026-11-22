import type { VoiceMode } from '@/types/curriculum';

export interface SpeakOptions {
  text: string;
  mode: VoiceMode;
  slow?: boolean;
  muted?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
}

interface SpeechSegment {
  text: string;
  lang: 'es-CO' | 'en-US' | 'fr-FR';
}

const FALLBACK_COOLDOWN_MS = 5 * 60 * 1000;

function stripTags(text: string): string {
  return text.replace(/\{(?:en|fr):([^}]+)\}/g, '$1').trim();
}

function parseSegments(text: string, mode: VoiceMode): SpeechSegment[] {
  if (mode === 'es-CO') return [{ text: stripTags(text), lang: 'es-CO' }];
  if (mode === 'en') return [{ text: stripTags(text), lang: 'en-US' }];
  if (mode === 'fr') return [{ text: stripTags(text), lang: 'fr-FR' }];

  const defaultLang: 'es-CO' | 'en-US' | 'fr-FR' = 'es-CO';
  const segments: SpeechSegment[] = [];
  const regex = /\{(en|fr):([^}]+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index).trim();
      if (before) segments.push({ text: before, lang: defaultLang });
    }
    const segLang = match[1] === 'en' ? 'en-US' : 'fr-FR';
    const segText = match[2].trim();
    if (segText) segments.push({ text: segText, lang: segLang });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    const rest = text.slice(lastIndex).trim();
    if (rest) segments.push({ text: rest, lang: defaultLang });
  }

  return segments.length > 0 ? segments : [{ text: stripTags(text), lang: defaultLang }];
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
      'valeria',
      'paulina',
      'dalia',
      'google español',
      'sabina',
      'helena',
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
      'samantha',
      'google us english',
      'zira',
      'libby',
      'en-us',
      'en-gb',
    ],
    'fr-FR': [
      'viviennemultilingual',
      'denise',
      'brigitte',
      'celine',
      'amélie',
      'amelie',
      'google français',
      'hortense',
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
  let bestScore = -1;

  for (const voice of pool) {
    const hay = `${voice.name} ${voice.lang}`.toLowerCase();
    let score = 0;

    if (hay.includes('natural') || hay.includes('online')) score += 40;
    if (hay.includes('google') || hay.includes('microsoft')) score += 15;
    if (hay.includes('female') || !/\b(male|david|mark|george|pablo|henri|paul|thomas)\b/.test(hay)) {
      score += 12;
    }

    for (let i = 0; i < patterns.length; i++) {
      if (hay.includes(patterns[i])) {
        score += (patterns.length - i) * 5;
        break;
      }
    }

    if (voice.lang.toLowerCase() === targetLang.toLowerCase()) {
      score += 25;
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
    const cacheKey = `${options.mode}:${slow ? 's' : 'n'}:${options.text}`;
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
            text: options.text.slice(0, 420),
            mode: options.mode,
            slow,
          }),
          signal: controller.signal,
        });

        if (runId !== this.activeRunId) return;

        if (res.ok) {
          const blob = await res.blob();
          if (blob.size > 0 && runId === this.activeRunId) {
            const url = URL.createObjectURL(blob);
            this.blobCache.set(cacheKey, url);
            await this.playAudioUrl(url, runId, options);
            return;
          }
        } else {
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
    this.speakWithBrowser(options.text, options.mode, slow, runId, options);
  }

  private async playAudioUrl(
    url: string,
    runId: number,
    options: SpeakOptions
  ): Promise<void> {
    if (runId !== this.activeRunId) return;

    const audio = new Audio(url);
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
          Boolean(options.slow),
          runId,
          options
        );
      }
    };

    try {
      await audio.play();
    } catch {
      if (runId === this.activeRunId) {
        this.speakWithBrowser(
          options.text,
          options.mode,
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
    const segments = parseSegments(text, mode);

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
        utterance.rate = slow ? 0.78 : seg.lang === 'es-CO' ? 1.0 : 0.94;
        utterance.pitch = 1.04;

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
