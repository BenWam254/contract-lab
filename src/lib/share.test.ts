import { describe, it, expect } from 'vitest';
import { encodeState, decodeState, AppState } from './share';

describe('Share State', () => {
  it('round trips valid state', () => {
    const state: AppState = { contract: '{"a":1}', newContract: '', payload: '{"a":1}', policy: 'reject' };
    const res = encodeState(state);
    expect(res.oversize).toBe(false);
    const decoded = decodeState(res.hash);
    expect(decoded).toEqual(state);
  });

  it('flags oversize state', () => {
    const largeString = 'a'.repeat(9000);
    const state: AppState = { contract: largeString, newContract: '', payload: '', policy: 'reject' };
    const res = encodeState(state);
    expect(res.oversize).toBe(true);
  });

  it('handles corrupt hash gracefully', () => {
    expect(decodeState('not-base64-!@#$')).toBeNull();
    expect(decodeState('eyJjb250cmFjdC')).toBeNull(); // truncated
  });
});