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
  return {
    language: settings.language === 'auto' ? undefined : settings.language,
    quality: settings.quality,
    vad: settings.vad,
    wordTimestamps: settings.wordTimestamps,
    prompt,
    device: 'cuda',
    compute_type: 'float16',
  };
}
