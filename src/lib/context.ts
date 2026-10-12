// Light, non-identifying signals that make each interview feel like it was written for you.
import type { ClientContext } from '../types/travel';

export const collectContext = (coords?: ClientContext['coords']): ClientContext => {
  const now = new Date();
  let timezone: string | undefined;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    /* older browsers */
  }
  return {
    timezone,
    locale: navigator.language,
    localTime: now.toLocaleString('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit', hour12: false }),
    device: window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768 ? 'mobile' : 'desktop',
    coords,
  };
};

/** Opt-in browser geolocation, rounded to one decimal (~10 km) before it leaves the device. */
export const requestCoords = () =>
  new Promise<NonNullable<ClientContext['coords']>>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: Math.round(pos.coords.latitude * 10) / 10, lon: Math.round(pos.coords.longitude * 10) / 10 }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 },
    );
  });
