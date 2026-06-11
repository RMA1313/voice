import type { Settings } from '../state/types';

export type WorkerSettings = {
  language?: 'fa' | 'ar' | 'en';
  quality: 'high' | 'balanced' | 'fast';
  vad: boolean;
  wordTimestamps: boolean;
  prompt: string;
  device: 'cuda' | 'cpu';
  compute_type: 'float16' | 'int8';
};

export function mapSettingsForWorker(settings: Settings, prompt: string): WorkerSettings {
  const trimmedPrompt = prompt.trim().slice(0, 160);
  return {
    language: settings.language === 'auto' ? undefined : settings.language,
    quality: settings.quality,
    vad: settings.vad,
    wordTimestamps: settings.wordTimestamps,
    prompt: trimmedPrompt,
    device: 'cuda',
    compute_type: 'float16',
  };
}
