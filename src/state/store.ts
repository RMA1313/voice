import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { exportTranscriptMarkdown, exportTranscriptText } from '../workers/export';
import { mapSettingsForWorker } from '../workers/settings';
import { exportTranscript, openAudioDialog, startTranscription } from '../tauri/api';
import type { Settings, Status, Theme } from './types';
import { defaultSettings } from './defaults';

export type WorkerHealth = { ok: boolean; cuda: boolean; message: string; modelPath?: string | null };

type State = {
  theme: Theme;
  settings: Settings;
  prompt: string;
  selectedAudioPath: string | null;
  selectedAudioName: string | null;
  status: Status;
  progress: number;
  transcript: string;
  error: string | null;
  selectAudioFile: () => Promise<void>;
  startTranscriptionJob: () => Promise<void>;
  cancelTranscription: () => void;
  setTranscript: (value: string) => void;
  setPrompt: (value: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  exportTxt: () => Promise<void>;
  exportMd: () => Promise<void>;
  toggleTheme: () => void;
};

export const useVoicStore = create<State>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      settings: defaultSettings,
      prompt: '',
      selectedAudioPath: null,
      selectedAudioName: null,
      status: 'idle',
      progress: 0,
      transcript: '',
      error: null,
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setTranscript: (value) => set({ transcript: value, status: value.trim() ? 'completed' : get().status }),
      setPrompt: (value) => set((state) => ({ prompt: value, settings: { ...state.settings, prompt: value } })),
      updateSettings: (patch) => set((state) => ({
        settings: { ...state.settings, ...patch },
        prompt: patch.prompt ?? state.prompt,
      })),
      selectAudioFile: async () => {
        try {
          const selected = await openAudioDialog();
          const path = selected[0] ?? null;
          const name = path ? path.split(/[\\/]/).pop() ?? path : null;
          set({
            selectedAudioPath: path,
            selectedAudioName: name,
            status: path ? 'ready' : 'idle',
            progress: 0,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          set({ error: message, status: 'failed' });
        }
      },
      startTranscriptionJob: async () => {
        const { selectedAudioPath, settings, prompt } = get();
        if (!selectedAudioPath) {
          set({ error: 'فایلی انتخاب نشده است', status: 'failed' });
          return;
        }
        set({ status: 'running', progress: 0, error: null });
        try {
          const completed = await startTranscription(selectedAudioPath, mapSettingsForWorker(settings, prompt));
          set({ transcript: completed.fullText, status: 'completed', progress: 100, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          set({ error: message, status: 'failed', progress: 0 });
        }
      },
      cancelTranscription: () => set({ status: 'cancelled' }),
      exportTxt: async () => {
        const transcript = get().transcript.trim();
        if (!transcript) return;
        await exportTranscript({ content: exportTranscriptText({ editedText: transcript }), format: 'txt' });
      },
      exportMd: async () => {
        const transcript = get().transcript.trim();
        if (!transcript) return;
        await exportTranscript({ content: exportTranscriptMarkdown({ editedText: transcript }), format: 'md' });
      },
    }),
    {
      name: 'voic-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        settings: state.settings,
        prompt: state.prompt,
        selectedAudioPath: state.selectedAudioPath,
        selectedAudioName: state.selectedAudioName,
        transcript: state.transcript,
      }),
    },
  ),
);
