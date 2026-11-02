export type ParseResult =
  | { ok: true; value: any }
  | { ok: false; message: string; line?: number; column?: number };

export function safeParseJson(text: string): ParseResult {
  try {
    const value = JSON.parse(text);
    return { ok: true, value };
  } catch (err) {
    if (err instanceof SyntaxError) {
      const match = err.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1] as string, 10);
        const prefix = text.substring(0, position);
        const lines = prefix.split('\n');
        const line = lines.length;
        const column = (lines[lines.length - 1]?.length ?? 0) + 1;
        return { ok: false, message: err.message, line, column };
      }
      return { ok: false, message: err.message };
    }
    return { ok: false, message: String(err) };
  }
}