import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { WorkerSettings } from '../workers/settings';
import type { WorkerHealth } from '../state/store';

export type WorkerCompletedPayload = {
  fullText: string;
  segments: Array<{ start: number; end: number; text: string }>;
  language: string;
  duration: number;
};

function isKnownUnavailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not available|unavailable|not initialized|Tauri|plugin dialog|dialog/i.test(message);
}

export async function openAudioDialog(): Promise<string[]> {
  try {
    const selected = await open({
      multiple: true,
      directory: false,
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'm4a', 'flac', 'ogg'] }],
    });
    if (!selected) return [];
    return Array.isArray(selected) ? selected : [selected];
  } catch (error) {
    if (isKnownUnavailableError(error)) {
      throw new Error('API دسکتاپ Tauri در دسترس نیست. برنامه را با npm run tauri dev اجرا کنید.');
    }
    throw error;
  }
}

export async function startTranscription(path: string, settings: WorkerSettings): Promise<WorkerCompletedPayload> {
  return invoke<WorkerCompletedPayload>('start_transcription', {
    path,
    settings,
  });
}

export async function exportTranscript(payload: { content: string; format: 'txt' | 'md'; path?: string }): Promise<string> {
  const savePath =
    payload.path ??
    (await save({
      defaultPath: payload.format === 'md' ? 'transcript.md' : 'transcript.txt',
      filters: [{ name: payload.format === 'md' ? 'Markdown' : 'Text', extensions: [payload.format] }],
    }));
  if (!savePath) {
    throw new Error('مسیر ذخیره‌سازی انتخاب نشد.');
  }
  return invoke<string>('export_transcript', { ...payload, path: savePath });
}

export async function getWorkerHealth(): Promise<WorkerHealth> {
  return invoke<WorkerHealth>('get_worker_health');
}
