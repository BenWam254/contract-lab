import { describe, it, expect } from 'vitest';
import { validate } from './validate';

describe('Validator', () => {
  it('reports malformed JSON', () => {
    const res = validate({ type: 'object' }, '{"bad": }');
    expect(res.ok).toBe(false);
    expect(res.violations[0]?.kind).toBe('malformed_json');
    expect(res.violations[0]?.path).toBe('');
  });

  it('reports missing required fields', () => {
    const contract = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    const res = validate(contract, '{}');
    expect(res.ok).toBe(false);
    expect(res.violations[0]?.kind).toBe('missing_required');
    expect(res.violations[0]?.path).toBe('/name');
  });

  it('detects type mismatches including integer/number rule', () => {
    const contract = {
      type: 'object',
      properties: {
        age: { type: 'integer' },
        rating: { type: 'number' },
      },
    };
    const res = validate(contract, '{"age": 25.5, "rating": 4.0}');
    expect(res.ok).toBe(false);
    expect(res.violations[0]?.kind).toBe('type_mismatch');
    expect(res.violations[0]?.path).toBe('/age'); // 25.5 is not integer
    // 4.0 parses as 4, validating perfectly against number
    expect(res.violations.length).toBe(1);
  });

  it('handles nested paths and array element paths', () => {
    const contract = {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: { type: 'string' } },
            required: ['id'],
          },
        },
      },
    };
    const res = validate(contract, '{"users": [{}, {"id": 1}]}');
    expect(res.ok).toBe(false);
    expect(res.violations.length).toBe(2);
    
    expect(res.violations[0]?.path).toBe('/users/0/id'); // <-- Fixed expectation
    expect(res.violations[0]?.kind).toBe('missing_required');
    
    expect(res.violations[1]?.path).toBe('/users/1/id');
    expect(res.violations[1]?.kind).toBe('type_mismatch');
  });

  it('handles union types and nulls', () => {
    const contract = { type: ['string', 'null'] };
    expect(validate(contract, '"hello"').ok).toBe(true);
    expect(validate(contract, 'null').ok).toBe(true);
    const res = validate(contract, '123');
    expect(res.ok).toBe(false);
    expect(res.violations[0]?.kind).toBe('type_mismatch');
  });

  it('reports enum violations', () => {
    const contract = { enum: ['A', 'B'] };
    expect(validate(contract, '"A"').ok).toBe(true);
    const res = validate(contract, '"C"');
    expect(res.ok).toBe(false);
    expect(res.violations[0]?.kind).toBe('enum_violation');
  });

  it('flags unsupported keywords as warnings and continues', () => {
    const contract = {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
      },
      $schema: 'http://json-schema.org/draft-07/schema#',
    };
    const res = validate(contract, '{"id": 123}');
    expect(res.ok).toBe(false);
    expect(res.warnings.length).toBe(2);
    
    expect(res.warnings[0]?.keyword).toBe('$schema');
    expect(res.warnings[0]?.path).toBe('');
    
    expect(res.warnings[1]?.keyword).toBe('format');
    expect(res.warnings[1]?.path).toBe('/properties/id');
    
    expect(res.violations[0]?.kind).toBe('type_mismatch');
  });

  it('applies unknown-field policies correctly', () => {
    const contract = {
      type: 'object',
      properties: { id: { type: 'string' } },
    };
    const payload = '{"id": "1", "extra": true}';

    const resReject = validate(contract, payload);
    expect(resReject.ok).toBe(false);
    expect(resReject.violations[0]?.kind).toBe('unknown_field');
    expect(resReject.violations[0]?.path).toBe('/extra');

    const resDrop = validate(contract, payload, 'drop');
    expect(resDrop.ok).toBe(true);
    expect(resDrop.violations.length).toBe(0);
    expect(resDrop.dropped).toEqual(['/extra']);

    const resAllow = validate(contract, payload, 'allow');
    expect(resAllow.ok).toBe(true);
    expect(resAllow.violations.length).toBe(0);
    expect(resAllow.dropped).toBeUndefined();
  });

  it('sorts violations deterministically', () => {
    const contract = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['a', 'b'],
    };
    const res = validate(contract, '{"b": 123, "c": true}');
    expect(res.ok).toBe(false);
    
    expect(res.violations[0]?.path).toBe('/a');
    expect(res.violations[1]?.path).toBe('/b');
    expect(res.violations[2]?.path).toBe('/c');
  });
});