export type UnknownFieldPolicy = 'reject' | 'drop' | 'allow';

export type ViolationKind =
  | 'malformed_json'
  | 'missing_required'
  | 'type_mismatch'
  | 'unknown_field'
  | 'enum_violation';

export interface Violation {
  kind: ViolationKind;
  path: string;
  expected: string;
  actual: string;
  message: string;
}

export interface ContractWarning {
  path: string;
  keyword: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: Violation[];
  warnings: ContractWarning[];
  dropped?: string[];
}

export type ChangeKind =
  | 'property_added'
  | 'property_removed'
  | 'type_changed'
  | 'required_added'
  | 'required_removed'
  | 'enum_values_added'
  | 'enum_values_removed'
  | 'additional_properties_changed'
  | 'items_changed';

export type ChangeSeverity = 'breaking' | 'non-breaking';

export interface Change {
  kind: ChangeKind;
  path: string;
  severity: ChangeSeverity;
  before: string;
  after: string;
  reason: string;
}

export interface DiffResult {
  changes: Change[];
  breaking: number;
  nonBreaking: number;
}