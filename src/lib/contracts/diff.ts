import { appendPath } from './pointer';
import type { Change, DiffResult } from './types';

function getNormalizedTypes(typeVal: any): string[] {
  if (!typeVal) return [];
  return Array.isArray(typeVal) ? typeVal : [typeVal];
}

function compareSchemas(oldSchema: any, newSchema: any, path: string, changes: Change[]) {
  if (!oldSchema || !newSchema || typeof oldSchema !== 'object' || typeof newSchema !== 'object') {
    return;
  }

  // 1. additionalProperties
  const oldAdd = oldSchema.additionalProperties ?? false;
  const newAdd = newSchema.additionalProperties ?? false;
  if (oldAdd !== newAdd) {
    changes.push({
      kind: 'additional_properties_changed',
      path,
      severity: oldAdd && !newAdd ? 'breaking' : 'non-breaking',
      before: String(oldAdd),
      after: String(newAdd),
      reason: oldAdd && !newAdd ? 'additionalProperties true to false' : 'additionalProperties false to true',
    });
  }

  // 2. properties
  const oldProps = oldSchema.properties || {};
  const newProps = newSchema.properties || {};
  const newReqSet = new Set<string>(newSchema.required || []);
  
  for (const key of Object.keys(oldProps)) {
    if (!(key in newProps)) {
      changes.push({
        kind: 'property_removed',
        path: appendPath(path, key),
        severity: 'breaking',
        before: 'present',
        after: 'missing',
        reason: 'Property removed',
      });
    }
  }

  for (const key of Object.keys(newProps)) {
    if (!(key in oldProps)) {
      const isReq = newReqSet.has(key);
      changes.push({
        kind: 'property_added',
        path: appendPath(path, key),
        severity: isReq ? 'breaking' : 'non-breaking',
        before: 'missing',
        after: 'present',
        reason: isReq ? 'Property added and listed in required' : 'Optional property added',
      });
    } else {
      compareSchemas(oldProps[key], newProps[key], appendPath(path, key), changes);
    }
  }

  // 3. required
  const oldReq = new Set<string>(oldSchema.required || []);
  const newReq = new Set<string>(newSchema.required || []);
  
  for (const r of oldReq) {
    if (!newReq.has(r)) {
      // Only emit required_removed if the property itself wasn't entirely removed
      if (r in newProps) {
        changes.push({
          kind: 'required_removed',
          path: appendPath(path, r),
          severity: 'non-breaking',
          before: 'required',
          after: 'optional',
          reason: 'Field moved from required to optional',
        });
      }
    }
  }
  for (const r of newReq) {
    if (!oldReq.has(r)) {
      if (r in oldProps) {
        changes.push({
          kind: 'required_added',
          path: appendPath(path, r),
          severity: 'breaking',
          before: 'optional',
          after: 'required',
          reason: 'Field moved from optional to required',
        });
      }
    }
  }

  // 4. type
  const oldTypes = getNormalizedTypes(oldSchema.type);
  const newTypes = getNormalizedTypes(newSchema.type);
  if (oldTypes.length > 0 && newTypes.length > 0) {
    const oldSubsetOfNew = oldTypes.every((o) => newTypes.includes(o) || (o === 'integer' && newTypes.includes('number')));
    const newSubsetOfOld = newTypes.every((n) => oldTypes.includes(n) || (n === 'integer' && oldTypes.includes('number')));

    if (!oldSubsetOfNew || !newSubsetOfOld) {
      if (oldSubsetOfNew && !newSubsetOfOld) {
        changes.push({
          kind: 'type_changed', path, severity: 'non-breaking',
          before: oldTypes.join(' | '), after: newTypes.join(' | '),
          reason: 'type widened',
        });
      } else if (!oldSubsetOfNew && newSubsetOfOld) {
        changes.push({
          kind: 'type_changed', path, severity: 'breaking',
          before: oldTypes.join(' | '), after: newTypes.join(' | '),
          reason: 'type narrowed',
        });
      } else {
        changes.push({
          kind: 'type_changed', path, severity: 'breaking',
          before: oldTypes.join(' | '), after: newTypes.join(' | '),
          reason: 'type changed to an unrelated type',
        });
      }
    }
  }

  // 5. enum
  if (oldSchema.enum || newSchema.enum) {
    const o = oldSchema.enum || [];
    const n = newSchema.enum || [];
    const oldStrs = o.map((v: any) => JSON.stringify(v));
    const newStrs = n.map((v: any) => JSON.stringify(v));
    
    const removed = oldStrs.filter((v: string) => !newStrs.includes(v));
    const added = newStrs.filter((v: string) => !oldStrs.includes(v));
    
    if (removed.length > 0) {
      changes.push({
        kind: 'enum_values_removed', path, severity: 'breaking',
        before: o.map((v: any) => JSON.stringify(v)).join(', '),
        after: n.map((v: any) => JSON.stringify(v)).join(', '),
        reason: 'enum value removed',
      });
    }
    if (added.length > 0) {
      changes.push({
        kind: 'enum_values_added', path, severity: 'non-breaking',
        before: o.map((v: any) => JSON.stringify(v)).join(', '),
        after: n.map((v: any) => JSON.stringify(v)).join(', '),
        reason: 'enum value added',
      });
    }
  }

  // 6. items
  if (oldSchema.items && newSchema.items) {
    compareSchemas(oldSchema.items, newSchema.items, appendPath(path, 'items'), changes);
  } else if (oldSchema.items && !newSchema.items) {
     changes.push({
       kind: 'items_changed', path: appendPath(path, 'items'),
       severity: 'non-breaking',
       before: 'present', after: 'missing',
       reason: 'items sub-contract changed',
     });
  } else if (!oldSchema.items && newSchema.items) {
     changes.push({
       kind: 'items_changed', path: appendPath(path, 'items'),
       severity: 'breaking', 
       before: 'missing', after: 'present',
       reason: 'items sub-contract changed',
     });
  }
}

export function diff(oldContract: any, newContract: any): DiffResult {
  const changes: Change[] = [];
  compareSchemas(oldContract, newContract, '', changes);
  
  changes.sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    if (a.kind < b.kind) return -1;
    if (a.kind > b.kind) return 1;
    return 0;
  });

  const breaking = changes.filter((c) => c.severity === 'breaking').length;
  const nonBreaking = changes.filter((c) => c.severity === 'non-breaking').length;

  return { changes, breaking, nonBreaking };
}