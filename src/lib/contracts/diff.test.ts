import { describe, it, expect } from 'vitest';
import { diff } from './diff';

describe('Differ', () => {
  it('detects Property removed (breaking)', () => {
    const res = diff({ properties: { a: {} } }, { properties: {} });
    expect(res.changes[0]?.reason).toBe('Property removed');
    expect(res.changes[0]?.severity).toBe('breaking');
  });

  it('detects Optional property added (non-breaking)', () => {
    const res = diff({ properties: {} }, { properties: { a: {} } });
    expect(res.changes[0]?.reason).toBe('Optional property added');
    expect(res.changes[0]?.severity).toBe('non-breaking');
  });

  it('detects Property added and listed in required (breaking)', () => {
    const res = diff({ properties: {} }, { properties: { a: {} }, required: ['a'] });
    expect(res.changes[0]?.reason).toBe('Property added and listed in required');
    expect(res.changes[0]?.severity).toBe('breaking');
  });

  it('detects Field moved from optional to required (breaking)', () => {
    const res = diff(
      { properties: { a: {} } },
      { properties: { a: {} }, required: ['a'] }
    );
    expect(res.changes[0]?.reason).toBe('Field moved from optional to required');
    expect(res.changes[0]?.severity).toBe('breaking');
  });

  it('detects Field moved from required to optional (non-breaking)', () => {
    const res = diff(
      { properties: { a: {} }, required: ['a'] },
      { properties: { a: {} } }
    );
    expect(res.changes[0]?.reason).toBe('Field moved from required to optional');
    expect(res.changes[0]?.severity).toBe('non-breaking');
  });

  it('detects type narrowed (breaking)', () => {
    // number -> integer
    const r1 = diff({ type: 'number' }, { type: 'integer' });
    expect(r1.changes[0]?.reason).toBe('type narrowed');
    expect(r1.changes[0]?.severity).toBe('breaking');
    
    // union loses a member
    const r2 = diff({ type: ['string', 'null'] }, { type: 'string' });
    expect(r2.changes[0]?.reason).toBe('type narrowed');
    expect(r2.changes[0]?.severity).toBe('breaking');
  });

  it('detects type widened (non-breaking)', () => {
    // integer -> number
    const r1 = diff({ type: 'integer' }, { type: 'number' });
    expect(r1.changes[0]?.reason).toBe('type widened');
    expect(r1.changes[0]?.severity).toBe('non-breaking');
    
    // union gains a member
    const r2 = diff({ type: 'string' }, { type: ['string', 'null'] });
    expect(r2.changes[0]?.reason).toBe('type widened');
    expect(r2.changes[0]?.severity).toBe('non-breaking');
  });

  it('detects type changed to an unrelated type (breaking)', () => {
    const res = diff({ type: 'string' }, { type: 'number' });
    expect(res.changes[0]?.reason).toBe('type changed to an unrelated type');
    expect(res.changes[0]?.severity).toBe('breaking');
  });

  it('detects enum value removed (breaking)', () => {
    const res = diff({ enum: ['A', 'B'] }, { enum: ['A'] });
    expect(res.changes[0]?.reason).toBe('enum value removed');
    expect(res.changes[0]?.severity).toBe('breaking');
  });

  it('detects enum value added (non-breaking)', () => {
    const res = diff({ enum: ['A'] }, { enum: ['A', 'B'] });
    expect(res.changes[0]?.reason).toBe('enum value added');
    expect(res.changes[0]?.severity).toBe('non-breaking');
  });

  it('detects additionalProperties true to false (breaking)', () => {
    const res = diff({ additionalProperties: true }, { additionalProperties: false });
    expect(res.changes[0]?.reason).toBe('additionalProperties true to false');
    expect(res.changes[0]?.severity).toBe('breaking');
  });

  it('detects additionalProperties false to true (non-breaking)', () => {
    const res = diff({ additionalProperties: false }, { additionalProperties: true });
    expect(res.changes[0]?.reason).toBe('additionalProperties false to true');
    expect(res.changes[0]?.severity).toBe('non-breaking');
  });

  it('handles nested objects and items recursion', () => {
    const oldContract = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    };
    const newContract = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { type: 'number' }
        }
      }
    };
    const res = diff(oldContract, newContract);
    expect(res.changes[0]?.path).toBe('/users/items');
    expect(res.changes[0]?.reason).toBe('type changed to an unrelated type');
  });

  it('sorts changes by path then kind', () => {
    const res = diff(
      { properties: { b: { type: 'string' }, a: { type: 'string' } } },
      { properties: { b: { type: 'number' }, a: { type: 'number' } } }
    );
    expect(res.changes[0]?.path).toBe('/a');
    expect(res.changes[1]?.path).toBe('/b');
  });
});