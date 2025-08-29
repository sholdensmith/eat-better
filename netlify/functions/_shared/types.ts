export type ParsedFood = {
  item: string; qty: number; unit: string;
  calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number;
  assumptions?: string[];
};

export type Entry = {
  id: string;
  dayKey: string;           // 'YYYY-MM-DD' (America/Los_Angeles)
  consumedAt: string;       // ISO
  item: string;
  qty: number;
  unit: string;             // 'g', 'ml', 'slice', 'tbsp', etc.
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: 'ai' | 'manual' | 'label';
  assumptions?: string[];
  previewImageUrl?: string; // optional (meta-only)
};

