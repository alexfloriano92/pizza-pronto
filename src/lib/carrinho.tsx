import * as React from "react";
import type { ItemPedido, Tamanho } from "./pedidos";

export type CarrinhoItem = ItemPedido & { key: string; imagem_url: string | null };

type CarrinhoContexto = {
  itens: CarrinhoItem[];
  totalItens: number;
  valorTotal: number;
  adicionar: (item: Omit<CarrinhoItem, "key">) => void;
  alterarQuantidade: (key: string, quantidade: number) => void;
  remover: (key: string) => void;
  limpar: () => void;
};

const Ctx = React.createContext<CarrinhoContexto | null>(null);
const STORAGE_KEY = "pizzafrita:carrinho";

function chaveItem(produtoId: string, tamanho: Tamanho | null, obs: string) {
  return `${produtoId}|${tamanho ?? "-"}|${obs.trim().toLowerCase()}`;
}

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = React.useState<CarrinhoItem[]>([]);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItens(JSON.parse(raw) as CarrinhoItem[]);
    } catch {
      /* ignora */
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch {
      /* ignora */
    }
  }, [itens]);

  const adicionar = React.useCallback((item: Omit<CarrinhoItem, "key">) => {
    const key = chaveItem(item.produto_id, item.tamanho, item.observacoes);
    setItens((atual) => {
      const existente = atual.find((i) => i.key === key);
      if (existente) {
        return atual.map((i) =>
          i.key === key ? { ...i, quantidade: i.quantidade + item.quantidade } : i,
        );
      }
      return [...atual, { ...item, key }];
    });
  }, []);

  const alterarQuantidade = React.useCallback((key: string, quantidade: number) => {
    setItens((atual) =>
      quantidade <= 0
        ? atual.filter((i) => i.key !== key)
        : atual.map((i) => (i.key === key ? { ...i, quantidade } : i)),
    );
  }, []);

  const remover = React.useCallback((key: string) => {
    setItens((atual) => atual.filter((i) => i.key !== key));
  }, []);

  const limpar = React.useCallback(() => setItens([]), []);

  const totalItens = itens.reduce((s, i) => s + i.quantidade, 0);
  const valorTotal = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);

  const value: CarrinhoContexto = {
    itens,
    totalItens,
    valorTotal,
    adicionar,
    alterarQuantidade,
    remover,
    limpar,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCarrinho() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useCarrinho precisa estar dentro de CarrinhoProvider");
  return ctx;
}
