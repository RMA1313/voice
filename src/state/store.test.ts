import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../tauri/api', () => ({
  exportTranscript: vi.fn().mockResolvedValue('saved.txt'),
  openAudioDialog: vi.fn(),
  startTranscription: vi.fn(),
}));

import { useVoicStore } from './store';
import { openAudioDialog, startTranscription } from '../tauri/api';

describe('voic store', () => {
  beforeEach(() => {
    vi.mocked(openAudioDialog).mockReset();
    vi.mocked(startTranscription).mockReset();
    useVoicStore.setState({
      theme: 'dark',
      settings: { language: 'auto', quality: 'balanced', vad: true, wordTimestamps: false, prompt: '' },
      prompt: '',
      selectedAudioPath: null,
      selectedAudioName: null,
      status: 'idle',
      progress: 0,
      transcript: '',
      error: null,
    });
  });

  it('stores the selected absolute path and filename', async () => {
    vi.mocked(openAudioDialog).mockResolvedValue(['/abs/path/11.mp3']);

    await useVoicStore.getState().selectAudioFile();

    expect(useVoicStore.getState().selectedAudioPath).toBe('/abs/path/11.mp3');
    expect(useVoicStore.getState().selectedAudioName).toBe('11.mp3');
    expect(useVoicStore.getState().status).toBe('ready');
  });

  it('starts transcription with the selected path', async () => {
    useVoicStore.setState({
      selectedAudioPath: '/abs/path/11.mp3',
      selectedAudioName: '11.mp3',
      prompt: 'سلام',
      settings: { language: 'fa', quality: 'balanced', vad: true, wordTimestamps: false, prompt: 'سلام' },
    });
    vi.mocked(startTranscription).mockResolvedValue({
      fullText: 'رونویسی نهایی',
      segments: [{ start: 0, end: 1, text: 'رونویسی نهایی' }],
      language: 'fa',
      duration: 1,
    });

    await useVoicStore.getState().startTranscriptionJob();

    expect(startTranscription).toHaveBeenCalledWith(
      '/abs/path/11.mp3',
      expect.objectContaining({ prompt: 'سلام' }),
    );
    expect(useVoicStore.getState().transcript).toBe('رونویسی نهایی');
    expect(useVoicStore.getState().status).toBe('completed');
  });

  it('blocks start when no file is selected', async () => {
    await useVoicStore.getState().startTranscriptionJob();

    expect(startTranscription).not.toHaveBeenCalled();
    expect(useVoicStore.getState().status).toBe('failed');
    expect(useVoicStore.getState().error).toBe('فایلی انتخاب نشده است');
  });
});
