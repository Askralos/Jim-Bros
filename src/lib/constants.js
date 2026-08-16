export const COLORS = {
  bg: "#111214",
  surface: "#1B1C20",
  surface2: "#232428",
  line: "#2E2F34",
  chalk: "#EDEBE2",
  muted: "#8C8D93",
  lime: "#C9F542",
  flame: "#FF6B4A",
  blue: "#5B9BD5",
};

export const SESSION_FEELINGS = [
  { key: "excellent", label: "Excellent" },
  { key: "good", label: "Bon" },
  { key: "normal", label: "Normal" },
  { key: "difficult", label: "Difficile" },
  { key: "very_difficult", label: "Très difficile" },
];

export const feelingLabel = (key) => SESSION_FEELINGS.find((f) => f.key === key)?.label || null;

export const DEFAULT_EXERCISES = [
  "Développé couché", "Squat", "Soulevé de terre", "Tractions", "Développé militaire",
  "Rowing barre", "Curl biceps", "Dips", "Fentes", "Gainage", "Pompes",
  "Presse à cuisses", "Extension triceps", "Élévations latérales", "Rowing haltère",
  "Leg curl", "Leg extension", "Hip thrust", "Développé incliné", "Shrugs",
];
