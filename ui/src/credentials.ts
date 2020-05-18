import { trimBase64Padding } from './utils';

const CLIENT_ID_LEN = 16;
const SECRET_LEN = 64;

export function generateClientId(): string {
  return randomID(CLIENT_ID_LEN)
}

export function generateSecret(): string {
  return randomID(SECRET_LEN)
}

function randomID(length: number) {
  const data = new Uint8Array(length);
  window.crypto.getRandomValues(data);
  return trimBase64Padding(btoa(String.fromCharCode.apply(null, data as unknown as number[])).replace(/\+/g, '-').replace(/\//g, '_'));
}
