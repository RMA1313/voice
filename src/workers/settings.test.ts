import { describe, expect, it } from 'vitest';
import { mapSettingsForWorker } from './settings';

describe('settings mapping', () => {
  it('maps balanced quality and language', () => {
    const mapped = mapSettingsForWorker({
      language: 'fa',
      quality: 'balanced',
      vad: true,
      wordTimestamps: false,
      prompt: '',
    }, 'سلام');
    expect(mapped.language).toBe('fa');
    expect(mapped.compute_type).toBe('float16');
    expect(mapped.prompt).toBe('سلام');
    expect(mapped.quality).toBe('balanced');
  });
});
