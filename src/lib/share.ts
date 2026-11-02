export interface AppState {
  contract: string;
  newContract: string;
  payload: string;
  policy: 'reject' | 'drop' | 'allow';
}

export function encodeState(state: AppState): { hash: string; oversize: boolean } {
  try {
    const str = JSON.stringify(state);
    const bytes = new TextEncoder().encode(str);
    if (bytes.length > 8192) {
      return { hash: '', oversize: true };
    }
    let bstr = '';
    for (let i = 0; i < bytes.length; i++) {
      bstr += String.fromCharCode(bytes[i]!);
    }
    const b64 = btoa(bstr);
    const hash = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return { hash, oversize: false };
  } catch (err) {
    return { hash: '', oversize: false };
  }
}

export function decodeState(hash: string): AppState | null {
  if (!hash) return null;
  try {
    let b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bstr = atob(b64);
    const bytes = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) {
      bytes[i] = bstr.charCodeAt(i);
    }
    const str = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(str);
    if (typeof parsed.contract === 'string' && typeof parsed.payload === 'string') {
      return parsed as AppState;
    }
    return null;
  } catch (err) {
    return null;
  }
}