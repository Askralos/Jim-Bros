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

export const EXERCISE_TAGS = [
  { key: "dos", label: "Dos", color: "#5B9BD5" },
  { key: "biceps", label: "Biceps", color: "#FF6B4A" },
  { key: "triceps", label: "Triceps", color: "#E0C64A" },
  { key: "epaules", label: "Épaules", color: "#B58CFF" },
  { key: "pecs", label: "Pecs", color: "#FF6FA8" },
  { key: "jambes", label: "Jambes", color: "#4CD9A0" },
];

export const tagLabel = (key) => EXERCISE_TAGS.find((t) => t.key === key)?.label || key;
export const tagColor = (key) => EXERCISE_TAGS.find((t) => t.key === key)?.color || COLORS.muted;

// Seuls ces pseudos peuvent modifier/supprimer un exercice de la bibliothèque partagée.
export const EXERCISE_ADMIN_USERNAMES = ["ludo", "siweil"];

export const MEASUREMENT_TYPES = [
  { key: "arm", label: "Tour de bras", field: "arm_cm" },
  { key: "chest", label: "Tour de poitrine", field: "chest_cm" },
  { key: "waist", label: "Tour de taille", field: "waist_cm" },
  { key: "thigh", label: "Tour de cuisse", field: "thigh_cm" },
];

export const WEIGHT_TYPES = [
  { key: "external", label: "Charge externe" },
  { key: "bodyweight", label: "Poids du corps" },
  { key: "bodyweight_plus", label: "Poids du corps + lest" },
  { key: "assisted", label: "Assisté" },
];

export const DEFAULT_EXERCISES = [
  "Développé couché", "Squat", "Soulevé de terre", "Tractions", "Développé militaire",
  "Rowing barre", "Curl biceps", "Dips", "Fentes", "Gainage", "Pompes",
  "Presse à cuisses", "Extension triceps", "Élévations latérales", "Rowing haltère",
  "Leg curl", "Leg extension", "Hip thrust", "Développé incliné", "Shrugs",
];
