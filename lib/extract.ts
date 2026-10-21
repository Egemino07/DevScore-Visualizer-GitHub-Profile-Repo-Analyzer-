export function extractUsername(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const urlMatch = raw.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_-]+)(?:\/([A-Za-z0-9_.-]+))?\/?$/i
  );
  if (urlMatch) return decodeURIComponent(urlMatch[1]);
  if (raw.startsWith("@")) return raw.slice(1);
  if (/^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/.test(raw)) return raw;
  return null;
}
