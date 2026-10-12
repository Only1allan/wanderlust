// Finds an openly licensed photo of a place on Wikimedia Commons, straight from the browser.
import { useEffect, useState } from 'react';
import { PLACE_PHOTOS } from './placePhotos';

export interface FoundPhoto {
  src: string;
  author: string;
  license: string;
  source: string;
}

const OPEN = /CC BY|CC0|Public domain|PD/i;
const strip = (html = '') => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function searchCommons(query: string): Promise<FoundPhoto | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: '1280',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal: AbortSignal.timeout(6000) });
  const data = await res.json();
  type Page = { index: number; imageinfo?: { thumburl: string; width: number; height: number; mime: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }[] };
  const pages = Object.values((data?.query?.pages ?? {}) as Record<string, Page>).sort((a, b) => a.index - b.index);
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii || ii.mime !== 'image/jpeg' || ii.width < ii.height * 1.25 || ii.width < 1000) continue;
    const license = ii.extmetadata?.LicenseShortName?.value ?? '';
    if (!OPEN.test(license)) continue;
    return { src: ii.thumburl, author: strip(ii.extmetadata?.Artist?.value) || 'Unknown', license, source: ii.descriptionurl };
  }
  return null;
}

/** A real photo of the place: bundled ones first, then a live Commons search. Null means "use the drawn postcard". */
export function usePlacePhoto(name: string, country: string) {
  const [photo, setPhoto] = useState<FoundPhoto | null>(null);
  useEffect(() => {
    let alive = true;
    setPhoto(null);
    const local = PLACE_PHOTOS.find((p) => name.toLowerCase().includes(p.place.toLowerCase()));
    if (local) {
      setPhoto(local);
      return;
    }
    const key = `wl.photo.${name}|${country}`;
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        setPhoto(JSON.parse(cached));
        return;
      }
    } catch {
      /* storage unavailable */
    }
    const base = name
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/\b(village|old town|town|island|islands|valley|beach|bay|district|neighbou?rhood)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const full = name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    (async () => {
      const found =
        (await searchCommons(`${full} ${country}`).catch(() => null)) ??
        (await searchCommons(`${base} ${country}`).catch(() => null)) ??
        (await searchCommons(base).catch(() => null));
      if (!alive || !found) return;
      setPhoto(found);
      try {
        sessionStorage.setItem(key, JSON.stringify(found));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [name, country]);
  return photo;
}
