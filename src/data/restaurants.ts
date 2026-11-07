/** Categorias de comida (no estilo do iFood). Para incluir uma nova: acrescente aqui, em CATEGORY_EMOJI e em useMapMarkers.drawGlyph. */
export const categories = [
  "Hambúrguer",
  "Lanches",
  "Pizza",
  "Italiana",
  "Brasileira",
  "Marmita",
  "Japonesa",
  "Carnes",
  "Saudável",
  "Vegetariana",
  "Árabe",
  "Chinesa",
  "Mexicana",
  "Pastel",
  "Doces e Bolos",
  "Açaí",
  "Sorvetes",
  "Padaria",
  "Café",
] as const;
export type Category = (typeof categories)[number];

export interface Hours {
  weekdays: string;
  weekends?: string;
}

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  category: Category;
  neighborhood: string;
  /** Preço inicial em reais ("a partir de"). Ausente = não exibir preço. */
  priceFrom?: number;
  delivery: boolean;
  image: string;
  coords: [number, number]; // [lng, lat]

  // Contato
  phone?: string;
  whatsapp?: string; // E.164 sem +, ex: 5534999999999
  ifoodUrl?: string;
  menuUrl?: string;
  instagram?: string;

  // Localização
  address?: string;

  // Horários
  hours?: Hours;

  // Galeria de fotos
  gallery?: string[];

  // Descrição curta
  description?: string;

  updatedAt?: string;
}


/** 25 -> "a partir de R$ 25" | 24.9 -> "a partir de R$ 24,90" | undefined -> undefined */
export function priceFromLabel(value?: number | null): string | undefined {
  if (value == null || !Number.isFinite(value) || value < 0) return undefined;
  const text = value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `a partir de R$ ${text}`;
}

export const CATEGORY_EMOJI: Record<Category, string> = {
  Hambúrguer: "🍔",
  Lanches: "🌭",
  Pizza: "🍕",
  Italiana: "🍝",
  Brasileira: "🍛",
  Marmita: "🍱",
  Japonesa: "🍣",
  Carnes: "🥩",
  Saudável: "🥗",
  Vegetariana: "🥬",
  Árabe: "🥙",
  Chinesa: "🥡",
  Mexicana: "🌮",
  Pastel: "🥟",
  "Doces e Bolos": "🍰",
  Açaí: "🍧",
  Sorvetes: "🍦",
  Padaria: "🥖",
  Café: "☕",
};

/** "Trattoria Bella" -> "trattoria-bella". Mesma regra usada no banco (coluna slug). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
