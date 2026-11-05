export type Category = "Italiana" | "Japonesa" | "Brasileira" | "Hambúrguer" | "Café" | "Vegetariana" | "Açaí";
export type Price = "$" | "$$" | "$$$";

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
  price: Price;
  delivery: boolean;
  rating: number;
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

export const categories: Category[] = [
  "Italiana",
  "Japonesa",
  "Brasileira",
  "Hambúrguer",
  "Café",
  "Vegetariana",
  "Açaí",
];
export const prices: Price[] = ["$", "$$", "$$$"];

export const CATEGORY_EMOJI: Record<Category, string> = {
  Italiana: "🍕",
  Japonesa: "🍣",
  Brasileira: "🍛",
  Hambúrguer: "🍔",
  Café: "☕",
  Vegetariana: "🥗",
  Açaí: "🍧",
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
