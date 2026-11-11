import { Utensils, Wine, type LucideIcon } from "lucide-react";

/**
 * Seções do menu de filtros do mapa.
 * Foco em comida e bebida: "Restaurantes" está ativo e "Bares e Baladas" aparece como "Em breve".
 * O subitem de restaurante usa o mesmo nome da Category do banco (campo `category`).
 */
export interface SubSection {
  label: string;
  /** Valor da Category no banco, quando o subitem filtra restaurantes. */
  category?: string;
}

export interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  items: SubSection[];
}

export const SECTIONS: Section[] = [
  {
    id: "restaurantes",
    label: "Restaurantes",
    icon: Utensils,
    active: true,
    items: [
      { label: "Hamburgueria", category: "Hambúrguer" },
      { label: "Lanches", category: "Lanches" },
      { label: "Pizza", category: "Pizza" },
      { label: "Italiana", category: "Italiana" },
      { label: "Brasileira", category: "Brasileira" },
      { label: "Marmita", category: "Marmita" },
      { label: "Japonesa", category: "Japonesa" },
      { label: "Carnes", category: "Carnes" },
      { label: "Saudável", category: "Saudável" },
      { label: "Vegetariana", category: "Vegetariana" },
      { label: "Árabe", category: "Árabe" },
      { label: "Chinesa", category: "Chinesa" },
      { label: "Mexicana", category: "Mexicana" },
      { label: "Pastel", category: "Pastel" },
      { label: "Doces e Bolos", category: "Doces e Bolos" },
      { label: "Açaí", category: "Açaí" },
      { label: "Sorvetes", category: "Sorvetes" },
      { label: "Padaria", category: "Padaria" },
      { label: "Café", category: "Café" },
    ],
  },
  {
    id: "bares",
    label: "Bares e Baladas",
    icon: Wine,
    active: false,
    items: [{ label: "Bar" }, { label: "Choperia" }, { label: "Pub" }, { label: "Balada" }, { label: "Casa de show" }],
  },
];
