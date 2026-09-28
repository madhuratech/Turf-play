/**
 * Client-side Device Identifier utility
 * Generates and stores a unique persistent UUID per browser profile/session
 * to distinguish scorers and enforce "one editor per team".
 */

const DEVICE_ID_KEY = 'kick_crease_device_id';
const DEVICE_NAME_KEY = 'kick_crease_device_name';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server_placeholder';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Scorer';
  let name = localStorage.getItem(DEVICE_NAME_KEY);
  if (!name) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    name = `Scorer-${randomSuffix}`;
    localStorage.setItem(DEVICE_NAME_KEY, name);
  }
  return name;
}

export function setDeviceName(name: string): void {
  localStorage.setItem(DEVICE_NAME_KEY, name);
}

// Utility to switch simulated device ID for testing multiple roles in single browser
export function switchSimulatedDevice(newId?: string): string {
  const nextId = newId || generateUUID();
  localStorage.setItem(DEVICE_ID_KEY, nextId);
  window.dispatchEvent(new CustomEvent('kc_device_changed', { detail: { deviceId: nextId } }));
  return nextId;
}
