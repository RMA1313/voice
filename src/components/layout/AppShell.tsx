import { useVoicStore } from '../../state/store';

export function AppShell({
  children,
  modelChip,
}: {
  children: React.ReactNode;
  modelChip: React.ReactNode;
}) {
  const theme = useVoicStore((s) => s.theme);
  const toggleTheme = useVoicStore((s) => s.toggleTheme);

  return (
    <div className={theme === 'light' ? 'light min-h-screen' : 'min-h-screen'}>
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-neutral-100">وُیس</h1>
              {modelChip}
            </div>
            <p className="text-sm text-neutral-400">تبدیل محلی فایل‌های صوتی به متن فارسی، آرام و متمرکز</p>
          </div>
          <button className="rounded-full bg-white/5 px-4 py-2 text-sm text-neutral-100 transition hover:bg-white/10" onClick={toggleTheme} type="button">
            {theme === 'dark' ? 'روشن' : 'تاریک'}
          </button>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
