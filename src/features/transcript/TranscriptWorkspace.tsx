import { useState } from 'react';
import { useVoicStore } from '../../state/store';

export function TranscriptWorkspace() {
  const transcript = useVoicStore((s) => s.transcript);
  const setTranscript = useVoicStore((s) => s.setTranscript);
  const exportTxt = useVoicStore((s) => s.exportTxt);
  const exportMd = useVoicStore((s) => s.exportMd);
  const [search, setSearch] = useState('');

  const wordCount = transcript ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = transcript.length;
  const canExport = Boolean(transcript.trim());

  return (
    <section className="relative min-h-[calc(100vh-10rem)] rounded-[2rem] bg-white/[0.04] px-5 py-5 shadow-[0_30px_100px_rgba(0,0,0,0.22)] sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3 text-sm text-neutral-400">
          <span>واژه {wordCount}</span>
          <span>·</span>
          <span>نویسه {charCount}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <input
            className="w-40 rounded-full bg-white/[0.05] px-4 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-500"
            placeholder="جستجو"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="text-neutral-300 transition hover:text-white disabled:opacity-40" onClick={() => navigator.clipboard.writeText(transcript)} type="button" disabled={!canExport}>
            کپی
          </button>
          <button className="text-neutral-300 transition hover:text-white disabled:opacity-40" onClick={exportTxt} type="button" disabled={!canExport}>
            TXT
          </button>
          <button className="text-neutral-300 transition hover:text-white disabled:opacity-40" onClick={exportMd} type="button" disabled={!canExport}>
            MD
          </button>
        </div>
      </div>
      <div className="relative mt-5">
        {transcript ? null : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center">
            <div className="max-w-xl space-y-3">
              <p className="text-2xl font-medium text-neutral-100">فضای نوشتن آماده است</p>
              <p className="text-sm leading-7 text-neutral-400">فایل صوتی را انتخاب کنید تا رونویسی همین‌جا ظاهر شود.</p>
            </div>
          </div>
        )}
        <textarea
          className="min-h-[62vh] w-full resize-none rounded-[1.5rem] bg-transparent px-1 py-2 text-[15px] leading-9 text-neutral-100 outline-none placeholder:text-neutral-500"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="متن رونویسی اینجا نمایش داده می‌شود."
        />
      </div>
      <div className="mt-4 text-xs text-neutral-500">
        {transcript ? 'ویرایش‌ها فقط روی متن اعمال می‌شوند.' : 'هنوز متنی برای نمایش وجود ندارد.'}
      </div>
    </section>
  );
}
