import { describe, expect, it } from 'vitest';
import { exportTranscriptMarkdown, exportTranscriptText } from './export';

describe('export formatting', () => {
  const draft = { rawText: ' raw ', editedText: 'متن نهایی', segments: [] };

  it('exports txt', () => {
    expect(exportTranscriptText(draft)).toBe('متن نهایی');
  });

  it('exports markdown', () => {
    expect(exportTranscriptMarkdown(draft)).toContain('# رونویسی');
  });
});
