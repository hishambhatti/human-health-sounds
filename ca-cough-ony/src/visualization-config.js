// --- Visualization Constants & Helpers ---

export const SOUND_TYPE_STYLES = {
  Sigh: { color: "#5DADE2", emoji: "🥱" },
  Throatclearing: { color: "#F5B041", emoji: "😤" },
  Sniff: { color: "#48C9B0", emoji: "👃" },
  Laughter: { color: "#E84393", emoji: "😂" },
  Sneeze: { color: "#E74C3C", emoji: "🤧" },
  Cough: { color: "#8E44AD", emoji: "😮‍💨" },
};

export const GENDER_COLORS = {
  Male: "#3498DB",
  Female: "#E84393",
  Other: "#1ABC9C",
};

export const AGE_COLORS = (age) => {
  const n = Number(age);
  if (n >= 18 && n <= 24) return "#2ECC71";
  if (n >= 25 && n <= 34) return "#F1C40F";
  if (n >= 35 && n <= 44) return "#E67E22";
  if (n >= 45 && n <= 54) return "#E74C3C";
  if (n >= 55 && n <= 64) return "#9B59B6";
  if (n >= 65) return "#9B59B6";
  return "#BDC3C7";
};

export const AGE_RANGES = [
  { label: "18–24", min: 18, max: 24 },
  { label: "25–34", min: 25, max: 34 },
  { label: "35–44", min: 35, max: 44 },
  { label: "45–54", min: 45, max: 54 },
  { label: "55–64", min: 55, max: 64 },
  { label: "65+", min: 65, max: Infinity },
];

export const AGE_RANGE_TO_COLOR = {
  "18–24": "#2ECC71",
  "25–34": "#F1C40F",
  "35–44": "#E67E22",
  "45–54": "#E74C3C",
  "55–64": "#9B59B6",
  "65+": "#9B59B6",
};

export const GRID_SIZE = 144
export const CELL_SIZE = 8
export const CELL_GAP = 0
export const INITIAL_SCALE = 2.0;
export const MIN_SCALE = 0.4;
export const MAX_SCALE = 8.0;
export const ZOOM_FACTOR = 1.03;
export const WHEEL_ZOOM_FACTOR = 1.05;
export const CENTER_SMOOTHING_FACTOR = 0.08;
export const MIN_PLAY_INTERVAL_MS = 125; // Max 8 playing simultaneously
export const TRAIL_FADE_MS = 1000; // 1 second fade duration