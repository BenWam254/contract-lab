import { safeParseJson } from './parse';
import { appendPath } from './pointer';
import type { Violation, ContractWarning, ValidationResult, UnknownFieldPolicy } from './types';

const SUPPORTED_KEYWORDS = new Set([
  'type',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
]);

function getTypeOf(val: any): string {
  if (val === null) return 'null';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return 'integer';
    return 'number';
  }
  return typeof val;
}

function checkType(val: any, expectedType: string | string[]): boolean {
  if (Array.isArray(expectedType)) {
    return expectedType.some((t: string) => checkType(val, t));
  }
  if (expectedType === 'any') return true;
  if (val === null) return expectedType === 'null';
  if (Array.isArray(val)) return expectedType === 'array';
  if (typeof val === 'number') {
    if (expectedType === 'number') return true;
    if (expectedType === 'integer') return Number.isInteger(val);
    return false;
  }
  if (typeof val === 'string') return expectedType === 'string';
  if (typeof val === 'boolean') return expectedType === 'boolean';
  if (typeof val === 'object') return expectedType === 'object';
  return false;
}

export function extractContractWarnings(
  schema: any,
  path: string = '',
  warnings: ContractWarning[] = [],
  visited = new Set()
): ContractWarning[] {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return warnings;
  if (visited.has(schema)) return warnings;
  visited.add(schema);

  for (const key of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(key)) {
      warnings.push({
        path,
        keyword: key,
        message: `Unsupported keyword '${key}'`,
      });
    }
  }
  if (schema.properties && typeof schema.properties === 'object') {
    for (const [k, v] of Object.entries(schema.properties)) {
      extractContractWarnings(v, appendPath(appendPath(path, 'properties'), k), warnings, visited);
    }
  }
  if (schema.items && typeof schema.items === 'object') {
    extractContractWarnings(schema.items, appendPath(path, 'items'), warnings, visited);
  }
  return warnings;
}

interface ValidationState {
  violations: Violation[];
  dropped: string[];
  policy: UnknownFieldPolicy;
}

function validateData(val: any, schema: any, path: string, state: ValidationState) {
  if (!schema || typeof schema !== 'object') return;

  // 1. Check type
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const typeMatches = types.some((t: string) => checkType(val, t));
    if (!typeMatches) {
      state.violations.push({
        kind: 'type_mismatch',
        path,
        expected: types.join(' | '),
        actual: getTypeOf(val),
        message: `Expected type ${types.join(' | ')}, got ${getTypeOf(val)}`,
      });
      return; // Skip deeper inspection if it's the wrong base type
    }
  }

  // 2. Check enum
  if (schema.enum && Array.isArray(schema.enum)) {
    const matches = schema.enum.some((e: null) => {
      if (typeof e === 'object' && e !== null) return JSON.stringify(e) === JSON.stringify(val);
      return e === val;
    });
    if (!matches) {
      state.violations.push({
        kind: 'enum_violation',
        path,
        expected: `One of: ${JSON.stringify(schema.enum)}`,
        actual: val === undefined ? 'undefined' : JSON.stringify(val),
        message: 'Value not in enum',
      });
    }
  }

  // 3. Object properties
  if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
    const required = Array.isArray(schema.required) ? schema.required : [];
    const props = schema.properties || {};
    const allowAdditional = schema.additionalProperties === true;

    for (const req of required) {
      if (!(req in val)) {
        state.violations.push({
          kind: 'missing_required',
          path: appendPath(path, req), // <-- Fixed path assignment here
          expected: 'present',
          actual: 'missing',
          message: `Missing required field: ${req}`,
        });
      }
    }

    for (const key of Object.keys(val)) {
      if (key in props) {
        validateData(val[key], props[key], appendPath(path, key), state);
      } else {
        if (!allowAdditional) {
          const unknownPath = appendPath(path, key);
          if (state.policy === 'reject') {
            state.violations.push({
              kind: 'unknown_field',
              path: unknownPath,
              expected: 'not present',
              actual: 'present',
              message: `Unknown field: ${key}`,
            });
          } else if (state.policy === 'drop') {
            state.dropped.push(unknownPath);
          }
        }
      }
    }
  }

  // 4. Array items
  if (Array.isArray(val)) {
    if (schema.items) {
      for (let i = 0; i < val.length; i++) {
        validateData(val[i], schema.items, appendPath(path, i), state);
      }
    }
  }
}

export function validate(
  contract: any,
  payloadText: string,
  policy: UnknownFieldPolicy = 'reject'
): ValidationResult {
  const parsed = safeParseJson(payloadText);
  if (!parsed.ok) {
    let msg = parsed.message;
    if (parsed.line !== undefined && parsed.column !== undefined) {
      msg += ` (Line ${parsed.line}, Col ${parsed.column})`;
    }
    return {
      ok: false,
      violations: [
        {
          kind: 'malformed_json',
          path: '',
          expected: 'valid JSON',
          actual: 'parse error',
          message: msg,
        },
      ],
      warnings: [],
    };
  }

  const warnings = extractContractWarnings(contract);
  warnings.sort((a, b) => a.path.localeCompare(b.path) || a.keyword.localeCompare(b.keyword));

  const state: ValidationState = {
    violations: [],
    dropped: [],
    policy,
  };

  validateData(parsed.value, contract, '', state);

  state.violations.sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    if (a.kind < b.kind) return -1;
    if (a.kind > b.kind) return 1;
    return 0;
  });

  state.dropped.sort();

  return {
    ok: state.violations.length === 0,
    violations: state.violations,
    warnings,
    dropped: state.dropped.length > 0 ? state.dropped : undefined,
  };
}