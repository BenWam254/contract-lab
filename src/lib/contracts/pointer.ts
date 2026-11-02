export function escapePointerToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function unescapePointerToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

export function appendPath(base: string, token: string | number): string {
  return `${base}/${escapePointerToken(String(token))}`;
}