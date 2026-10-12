// Openly licensed photos from Wikimedia Commons, stored in /public/places. Credits are shown in the app.
export interface PlacePhoto {
  slug: string;
  place: string;
  country: string;
  src: string;
  author: string;
  license: string;
  licenseUrl: string;
  source: string;
}

export const PLACE_PHOTOS: PlacePhoto[] = [
  {
    "slug": "reine",
    "place": "Reine",
    "country": "Norway",
    "src": "/places/reine.webp",
    "author": "Ximonic (Simo Räsänen)",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Houses_of_Reine_by_Gravdalsbukta,_Moskenes,_Nordland,_Norway,_2022_June.jpg"
  },
  {
    "slug": "lamu",
    "place": "Lamu Old Town",
    "country": "Kenya",
    "src": "/places/lamu.webp",
    "author": "Mzein04",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Lamu_old_town_street.jpg"
  },
  {
    "slug": "kanazawa",
    "place": "Kanazawa",
    "country": "Japan",
    "src": "/places/kanazawa.webp",
    "author": "AudaCity3371",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Higashi_Chaya_District_of_Kanazawa_-_panoramio.jpg"
  },
  {
    "slug": "wadi-rum",
    "place": "Wadi Rum",
    "country": "Jordan",
    "src": "/places/wadi-rum.webp",
    "author": "Peter Chisholm",
    "license": "CC0",
    "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "source": "https://commons.wikimedia.org/wiki/File:Wadi_rum_desert.jpg"
  },
  {
    "slug": "matera",
    "place": "Matera",
    "country": "Italy",
    "src": "/places/matera.webp",
    "author": "Jules Verne Times Two",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:View_of_Sassi_di_Matera,_Matera,_Italy_(PPL1-Corrected)_julesvernex2.jpg"
  },
  {
    "slug": "sighnaghi",
    "place": "Sighnaghi",
    "country": "Georgia",
    "src": "/places/sighnaghi.webp",
    "author": "Sergey Sebelev",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Sighnaghi_town_wall_(Georgia).jpg"
  },
  {
    "slug": "bunyonyi",
    "place": "Lake Bunyonyi",
    "country": "Uganda",
    "src": "/places/bunyonyi.webp",
    "author": "BalukuBrian",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Bunyonyi_Safaris_Resort_in_Kabale_District_near_Lake_Bunyonyi_03.jpg"
  }
];

export const photoFor = (slug: string) => PLACE_PHOTOS.find((p) => p.slug === slug);
