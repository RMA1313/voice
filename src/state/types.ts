export type Theme = 'dark' | 'light';

export type Settings = {
  language: 'fa' | 'ar' | 'en' | 'auto';
  quality: 'high' | 'balanced' | 'fast';
  vad: boolean;
  wordTimestamps: boolean;
  prompt: string;
};

export type Status = 'idle' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
