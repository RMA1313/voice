import { useVoicStore } from '../../state/store';
import type { Settings } from '../../state/types';

export function CommandRail() {
  const settings = useVoicStore((s) => s.settings);
  const prompt = useVoicStore((s) => s.prompt);
  const selectAudioFile = useVoicStore((s) => s.selectAudioFile);
  const selectedAudioName = useVoicStore((s) => s.selectedAudioName);
  const status = useVoicStore((s) => s.status);
  const progress = useVoicStore((s) => s.progress);
  const startTranscriptionJob = useVoicStore((s) => s.startTranscriptionJob);
  const setPrompt = useVoicStore((s) => s.setPrompt);
  const updateSettings = useVoicStore((s) => s.updateSettings);

  return (
    <aside className="space-y-5">
      <section className="space-y-3">
        <button className="w-full rounded-3xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-neutral-100 transition hover:bg-white/8" onClick={selectAudioFile} type="button">
          انتخاب فایل صوتی
        </button>
        <button className="flex w-full items-center justify-between rounded-3xl bg-white px-4 py-3 text-sm font-medium text-neutral-950 transition hover:opacity-95 disabled:opacity-40" onClick={startTranscriptionJob} type="button" disabled={!selectedAudioName || status === 'running'}>
          <span>شروع رونویسی</span>
          <span className="text-xs text-neutral-500">{status}</span>
        </button>
        <div className="rounded-3xl bg-white/[0.03] p-4 text-sm text-neutral-300">
          {selectedAudioName ? `فایل انتخاب‌شده: ${selectedAudioName}` : 'فایلی انتخاب نشده است'}
        </div>
        <div className="text-sm text-neutral-400">
          {status === 'running'
            ? 'در حال رونویسی...'
            : status === 'completed'
              ? 'رونویسی کامل شد'
              : status === 'cancelled'
                ? 'رونویسی لغو شد'
                : status === 'failed'
                  ? 'خطا در رونویسی'
                  : ''}
        </div>
        <div className="text-xs text-neutral-500">پیشرفت: {progress}%</div>
      </section>

      <section className="space-y-3 border-t border-white/8 pt-5">
        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">پرامپت</div>
        <textarea
          className="min-h-24 w-full rounded-3xl bg-white/[0.04] px-4 py-3 text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
          placeholder="پرامپت اولیه"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </section>

      <section className="space-y-3 border-t border-white/8 pt-5">
        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">تنظیمات</div>
        <label className="grid gap-1 text-sm text-neutral-300">
          <span>زبان</span>
          <select className="rounded-2xl bg-white/[0.04] px-3 py-2" value={settings.language} onChange={(e) => updateSettings({ language: e.target.value as Settings['language'] })}>
            <option value="auto">خودکار</option>
            <option value="fa">فارسی</option>
            <option value="ar">عربی</option>
            <option value="en">انگلیسی</option>
          </select>
        </label>
      </section>
    </aside>
  );
}
