import {
  Utensils,
  Wine,
  ShoppingCart,
  HeartPulse,
  Scissors,
  Dumbbell,
  Landmark,
  BedDouble,
  Clapperboard,
  ShoppingBag,
  GraduationCap,
  PawPrint,
  Fuel,
  type LucideIcon,
} from "lucide-react";

/**
 * Seções do menu de filtros do mapa.
 * Só "restaurantes" está ativo; as demais aparecem como "Em breve".
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
  {
    id: "mercados",
    label: "Mercados e Padarias",
    icon: ShoppingCart,
    active: false,
    items: [{ label: "Supermercado" }, { label: "Padaria" }, { label: "Hortifruti" }, { label: "Açougue" }, { label: "Conveniência" }],
  },
  {
    id: "saude",
    label: "Saúde",
    icon: HeartPulse,
    active: false,
    items: [{ label: "Farmácia" }, { label: "Clínica" }, { label: "Hospital e UPA" }, { label: "Dentista" }, { label: "Laboratório" }],
  },
  {
    id: "beleza",
    label: "Beleza e Bem-estar",
    icon: Scissors,
    active: false,
    items: [{ label: "Salão" }, { label: "Barbearia" }, { label: "Estética" }, { label: "Spa e massagem" }],
  },
  {
    id: "esportes",
    label: "Academias e Esportes",
    icon: Dumbbell,
    active: false,
    items: [{ label: "Academia" }, { label: "Quadras" }, { label: "Estúdio de pilates" }, { label: "Artes marciais" }],
  },
  {
    id: "servicos",
    label: "Serviços",
    icon: Landmark,
    active: false,
    items: [{ label: "Banco e caixa 24h" }, { label: "Lotérica" }, { label: "Correios" }, { label: "Oficina mecânica" }, { label: "Lavanderia" }],
  },
  {
    id: "hospedagem",
    label: "Hospedagem",
    icon: BedDouble,
    active: false,
    items: [{ label: "Hotel" }, { label: "Pousada" }, { label: "Hostel" }],
  },
  {
    id: "lazer",
    label: "Lazer e Cultura",
    icon: Clapperboard,
    active: false,
    items: [{ label: "Cinema" }, { label: "Teatro" }, { label: "Parque e praça" }, { label: "Museu" }],
  },
  {
    id: "compras",
    label: "Compras",
    icon: ShoppingBag,
    active: false,
    items: [{ label: "Shopping" }, { label: "Roupas e calçados" }, { label: "Eletrônicos" }, { label: "Casa e decoração" }],
  },
  {
    id: "educacao",
    label: "Educação",
    icon: GraduationCap,
    active: false,
    items: [{ label: "Escola" }, { label: "Faculdade" }, { label: "Idiomas" }, { label: "Cursos" }],
  },
  {
    id: "pets",
    label: "Pets",
    icon: PawPrint,
    active: false,
    items: [{ label: "Pet shop" }, { label: "Veterinário" }, { label: "Banho e tosa" }],
  },
  {
    id: "transporte",
    label: "Transporte e Combustível",
    icon: Fuel,
    active: false,
    items: [{ label: "Posto de combustível" }, { label: "Estacionamento" }, { label: "Rodoviária" }, { label: "Aluguel de carros" }],
  },
];
