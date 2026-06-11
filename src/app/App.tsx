import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useVoicStore } from '../state/store';
import { AppShell } from '../components/layout/AppShell';
import { TranscriptWorkspace } from '../features/transcript/TranscriptWorkspace';
import { CommandRail } from '../features/command/CommandRail';

export function App() {
  const theme = useVoicStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    let active = true;
    let unlistenProgress: (() => void) | undefined;
    let unlistenSegment: (() => void) | undefined;
    let unlistenCompleted: (() => void) | undefined;
    let unlistenError: (() => void) | undefined;

    void (async () => {
      const progressListener = await listen('voic-progress', (event) => {
        const payload = event.payload as { payload?: { progress?: number } } | undefined;
        const progress = payload?.payload?.progress;
        if (typeof progress === 'number') {
          useVoicStore.setState({ progress, status: 'running' });
        }
      });
      const segmentListener = await listen('voic-segment', (event) => {
        const payload = event.payload as { payload?: { text?: string } } | undefined;
        const text = payload?.payload?.text?.trim();
        if (!text) return;
        useVoicStore.setState((state) => {
          const current = state.transcript;
          const separator = current && !/\s$/.test(current) ? ' ' : '';
          return { transcript: `${current}${separator}${text}` };
        });
      });
      const completedListener = await listen('voic-completed', (event) => {
        const payload = event.payload as { payload?: { fullText?: string } } | undefined;
        const fullText = payload?.payload?.fullText ?? '';
        useVoicStore.setState({ transcript: fullText, status: 'completed', progress: 100, error: null });
      });
      const errorListener = await listen('voic-error', (event) => {
        const payload = event.payload as unknown;
        const errorText = typeof payload === 'string' ? payload : JSON.stringify(payload);
        useVoicStore.setState({ error: errorText, status: 'failed', progress: 0 });
      });
      if (!active) {
        await progressListener();
        await segmentListener();
        await completedListener();
        await errorListener();
        return;
      }
      unlistenProgress = progressListener;
      unlistenSegment = segmentListener;
      unlistenCompleted = completedListener;
      unlistenError = errorListener;
    })();

    return () => {
      active = false;
      void unlistenProgress?.();
      void unlistenSegment?.();
      void unlistenCompleted?.();
      void unlistenError?.();
    };
  }, []);

  return (
    <AppShell
      modelChip={<span className="rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-300">مدل محلی</span>}
    >
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <CommandRail />
        <TranscriptWorkspace />
      </div>
    </AppShell>
  );
}
