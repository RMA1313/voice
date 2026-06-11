import { useEffect } from 'react';
import { useVoicStore } from '../state/store';
import { AppShell } from '../components/layout/AppShell';
import { TranscriptWorkspace } from '../features/transcript/TranscriptWorkspace';
import { CommandRail } from '../features/command/CommandRail';

export function App() {
  const theme = useVoicStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

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
