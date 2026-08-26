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

export type FormaPagamento = "cartao" | "pix" | "dinheiro";

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  cartao: "Cartão",
  pix: "Pix",
  dinheiro: "Dinheiro",
};

export type Pedido = {
  forma_pagamento: FormaPagamento;
  troco_para: number | null;
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
  /** Caminho bruto salvo no banco (Storage ou URL externa) */
  imagem_ref?: string | null;
  disponivel: boolean;
  promocao: boolean;
  preco_promocional: number | null;
  precos: { id: string; tamanho: Tamanho | null; preco: number }[];
};

export const IMAGEM_FALLBACK =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80";
