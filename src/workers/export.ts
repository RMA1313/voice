type TranscriptDraftLike = { editedText: string };

export function exportTranscriptText(draft: TranscriptDraftLike): string {
  return draft.editedText.trim();
}

export function exportTranscriptMarkdown(draft: TranscriptDraftLike): string {
  return `# رونویسی\n\n${draft.editedText.trim()}\n`;
}
