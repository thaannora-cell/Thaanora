// Which "feel" text describes a fabric (Panel.feel.<key> in the translations).
export const FEEL_KEYS: Record<string, string> = {
  Khaddar: "khaddar",
  "Khaddar + shawl": "khaddarShawl",
  "Light khaddar": "lightKhaddar",
  "Raw silk": "rawSilk",
  "Marina viscose": "marina",
  "Yarn-dyed jacquard": "jacquard",
  Karandi: "karandi",
  "Cotton twill": "twill",
  "Winter blend": "winterBlend",
  Pashmina: "pashmina",
  Linen: "linen",
};
export const feelKey = (fabric: string) => FEEL_KEYS[fabric] ?? "default";
