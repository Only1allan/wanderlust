// Openly licensed scene photos from Wikimedia Commons (in /public/scenes), matched to interview scenes by setting.
export interface ScenePhoto {
  slug: string;
  caption: string;
  src: string;
  keys: string;
  author: string;
  license: string;
  source: string;
}

export const SCENE_PHOTOS: ScenePhoto[] = [
  {
    "slug": "perast",
    "caption": "Bay of Kotor, Montenegro",
    "src": "/scenes/perast.webp",
    "keys": "bay|lake|sea|viewpoint|view|hot spring",
    "author": "Gzzz",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Bay_of_Kotor_from_Lepetani%27s_road.jpg"
  },
  {
    "slug": "gimmelwald",
    "caption": "Lauterbrunnen valley, Switzerland",
    "src": "/scenes/gimmelwald.webp",
    "keys": "mountain|hike|trail|ridge|hut|snow|hill|peak",
    "author": "Keith Halstead",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Lauterbrunnen-valley.jpg"
  },
  {
    "slug": "train",
    "caption": "Bernina Express, Switzerland",
    "src": "/scenes/train.webp",
    "keys": "train|rail|station|cabin|carriage",
    "author": "Kabelleger / David Gubler (http://www.bahnbilder.ch)",
    "license": "CC BY-SA 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:RhB_ABe_4-4_III_mit_Bernina-Express_am_Lago_Bianco.jpg"
  },
  {
    "slug": "hoian",
    "caption": "Hội An, Vietnam",
    "src": "/scenes/hoian.webp",
    "keys": "market|food|menu|lunch|dinner|stall|lantern|festival|shop|cook",
    "author": "Steffen Schmitz (more photos)",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:H%E1%BB%99i_An,_Ancient_Town,_2020-01_CN-10.jpg"
  },
  {
    "slug": "chefchaouen",
    "caption": "Chefchaouen, Morocco",
    "src": "/scenes/chefchaouen.webp",
    "keys": "village|alley|guesthouse|family|small town|walk",
    "author": "Buiobuione",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Street_in_the_city_of_Chefchaouen_323232.jpg"
  },
  {
    "slug": "valparaiso",
    "caption": "Valparaíso, Chile",
    "src": "/scenes/valparaiso.webp",
    "keys": "city|hostel|hotel|museum|caf[eé]|airport|luggage|arrival|bus|bicycle",
    "author": "Carlos Figueroa Rojas",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Casa_Celeste_Hostal,_Cerro_Alegre,_Valpara%C3%ADso_20201102_119.jpg"
  },
  {
    "slug": "hampi",
    "caption": "Hampi, India",
    "src": "/scenes/hampi.webp",
    "keys": "rock|boulder|ruin|temple|cave|sunrise",
    "author": "Vyacheslav Argenberg",
    "license": "CC BY 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Hampi,_India,_Rocky_landscape_of_Hampi,_Granite_rocks_of_Matanga_Hill.jpg"
  },
  {
    "slug": "iona",
    "caption": "Iona, Scotland",
    "src": "/scenes/iona.webp",
    "keys": "island|beach|shore|tide|coast",
    "author": "Timo Newton-Syms from Helsinki, Finland &amp; Maidenhead, Berkshire, UK",
    "license": "CC BY-SA 2.0",
    "source": "https://commons.wikimedia.org/wiki/File:Iona_(3574516800).jpg"
  },
  {
    "slug": "harbour",
    "caption": "Le Grau-du-Roi, France",
    "src": "/scenes/harbour.webp",
    "keys": "harbou?r|port|boat|ferry|fisherm|dock|pier|sail",
    "author": "Benjamin Smith",
    "license": "CC BY-SA 4.0",
    "source": "https://commons.wikimedia.org/wiki/File:Le_Grau-du-Roi_-_Sunset_over_the_port%27s_canal_-_01.jpg"
  },
  {
    "slug": "desert",
    "caption": "Sand dunes, USA",
    "src": "/scenes/desert.webp",
    "keys": "desert|dune|sand|camp|border",
    "author": "BLMUtah",
    "license": "Public domain",
    "source": "https://commons.wikimedia.org/wiki/File:Sand_dunes_at_LSRA_(53631954534).jpg"
  },
  {
    "slug": "rain",
    "caption": "Night river, evening lights",
    "src": "/scenes/rain.webp",
    "keys": "rain|storm|night|dark|midnight|neon|10pm|9pm|late evening",
    "author": "Ratul Ahsan",
    "license": "CC BY 3.0",
    "source": "https://commons.wikimedia.org/wiki/File:Clouds_On_A_Rainy_Day_(156286869).jpeg"
  }
];

/** Best photo for a scene's setting and prompt; unused ones first so a story never repeats a picture. */
export const photoForScene = (text: string, used: string[] = []): ScenePhoto => {
  const fresh = SCENE_PHOTOS.filter((p) => !used.includes(p.slug));
  const pool = fresh.length ? fresh : SCENE_PHOTOS;
  const match = pool.find((p) => new RegExp(p.keys, 'i').test(text));
  if (match) return match;
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length];
};
