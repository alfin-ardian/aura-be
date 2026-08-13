export function parseGuestName(summary: string | null | undefined, fallback?: string | null): string {
  if (fallback && fallback.trim()) return fallback.trim();
  const text = summary ?? '';
  const colonIdx = text.indexOf(': ');
  if (colonIdx > 0 && colonIdx < 40) {
    return text.slice(0, colonIdx).trim();
  }
  return 'Guest';
}

export function analysisSummary(input: {
  skinTone: string;
  undertone: string;
  faceShape: string;
}): string {
  return `${input.skinTone} · ${input.undertone} undertone · ${input.faceShape}`;
}
