import { describe, expect, it } from 'vitest';
import { isValidAudioFile } from './fileValidation';

describe('file validation', () => {
  it('accepts supported audio files', () => {
    expect(isValidAudioFile('lecture.mp3')).toBe(true);
    expect(isValidAudioFile('lecture.wav')).toBe(true);
  });

  it('rejects unsupported files', () => {
    expect(isValidAudioFile('notes.pdf')).toBe(false);
  });
});
