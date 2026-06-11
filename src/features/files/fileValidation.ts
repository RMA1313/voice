const allowed = new Set(['mp3', 'wav', 'm4a', 'flac', 'ogg']);

export function isValidAudioFile(name: string): boolean {
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : '';
  return allowed.has(ext);
}
