export type Tamanho = "pequena" | "media" | "grande";

export type StatusPedido =
  | "recebido"
  | "em_preparo"
  | "saiu_para_entrega"
  | "finalizado";

export const STATUS_ORDEM: StatusPedido[] = [
  "recebido",
  "em_preparo",
  "saiu_para_entrega",
  "finalizado",
];

export const STATUS_LABEL: Record<StatusPedido, string> = {
  recebido: "Recebido",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu para entrega",
  finalizado: "Finalizado",
};

export const TAMANHO_LABEL: Record<Tamanho, string> = {
  pequena: "Pequena",
  media: "Média",
  grande: "Grande",
};

export function proximoStatus(status: StatusPedido): StatusPedido | null {
  const i = STATUS_ORDEM.indexOf(status);
  return i >= 0 && i < STATUS_ORDEM.length - 1
    ? (STATUS_ORDEM[i + 1] as StatusPedido)
    : null;
}

export function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type ItemPedido = {
  produto_id: string;
  nome: string;
  tipo: "pizza" | "bebida";
  tamanho: Tamanho | null;
  quantidade: number;
  observacoes: string;
  preco_unitario: number;
};

export type Pedido = {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_entrega: "retirada" | "entrega";
  endereco: string | null;
  itens: ItemPedido[];
  valor_total: number;
  status: StatusPedido;
  criado_em: string;
  atualizado_em: string;
};

export type Produto = {
  id: string;
  tipo: "pizza" | "bebida";
  nome: string;
  descricao: string;
  imagem_url: string | null;
  disponivel: boolean;
  precos: { id: string; tamanho: Tamanho | null; preco: number }[];
};

export const IMAGEM_FALLBACK =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80";
