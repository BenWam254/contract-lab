import { describe, it, expect } from 'vitest';
import { escapePointerToken, unescapePointerToken, appendPath } from './pointer';

describe('JSON Pointer', () => {
  it('escapes tilde and slash', () => {
    expect(escapePointerToken('my~field/name')).toBe('my~0field~1name');
    expect(escapePointerToken('~/~')).toBe('~0~1~0');
  });

  it('unescapes tilde and slash', () => {
    expect(unescapePointerToken('my~0field~1name')).toBe('my~field/name');
    expect(unescapePointerToken('~0~1~0')).toBe('~/~');
  });

  it('appends path to root', () => {
    expect(appendPath('', 'orders')).toBe('/orders');
  });

  it('appends array index', () => {
    expect(appendPath('/orders', 0)).toBe('/orders/0');
  });

  it('appends escaped path segment', () => {
    expect(appendPath('/data', 'key/with~tilde')).toBe('/data/key~1with~0tilde');
  });
});