import { supabase } from "@/integrations/supabase/client";
import type { Produto } from "./pedidos";

type LinhaPreco = { id: string; tamanho: string | null; preco: number | string };

export async function buscarProdutos(apenasDisponiveis: boolean): Promise<Produto[]> {
  let query = supabase
    .from("produtos")
    .select("id, tipo, nome, descricao, imagem_url, disponivel, precos_produto(id, tamanho, preco)")
    .order("nome", { ascending: true });

  if (apenasDisponiveis) query = query.eq("disponivel", true);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((p) => {
    const precos = ((p as unknown as { precos_produto: LinhaPreco[] }).precos_produto ?? []).map(
      (pr) => ({
        id: pr.id,
        tamanho: (pr.tamanho ?? null) as Produto["precos"][number]["tamanho"],
        preco: Number(pr.preco),
      }),
    );
    return {
      id: p.id as string,
      tipo: p.tipo as Produto["tipo"],
      nome: p.nome as string,
      descricao: (p.descricao as string) ?? "",
      imagem_url: (p.imagem_url as string) ?? null,
      disponivel: p.disponivel as boolean,
      precos,
    };
  });
}

export const ORDEM_TAMANHO = ["pequena", "media", "grande"] as const;

export function precosOrdenados(produto: Produto) {
  return [...produto.precos].sort(
    (a, b) =>
      ORDEM_TAMANHO.indexOf(a.tamanho as never) - ORDEM_TAMANHO.indexOf(b.tamanho as never),
  );
}
