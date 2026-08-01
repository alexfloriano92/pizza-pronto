import { supabase } from "@/integrations/supabase/client";
import type { Produto } from "./pedidos";

type LinhaPreco = { id: string; tamanho: string | null; preco: number | string };

export const BUCKET_PRODUTOS = "produtos";

function ehUrlExterna(valor: string) {
  return /^(https?:|data:|blob:|\/)/i.test(valor);
}

/** Converte caminhos do Storage em URLs assinadas (imagens ficam em bucket privado). */
export async function resolverImagens(valores: (string | null)[]): Promise<(string | null)[]> {
  const caminhos = Array.from(
    new Set(valores.filter((v): v is string => !!v && !ehUrlExterna(v))),
  );
  if (caminhos.length === 0) return valores;

  const { data } = await supabase.storage
    .from(BUCKET_PRODUTOS)
    .createSignedUrls(caminhos, 60 * 60 * 6);

  const mapa = new Map<string, string>();
  (data ?? []).forEach((item) => {
    if (item.path && item.signedUrl) mapa.set(item.path, item.signedUrl);
  });

  return valores.map((v) => (v && !ehUrlExterna(v) ? (mapa.get(v) ?? null) : v));
}

/** Envia uma imagem para o bucket e devolve o caminho salvo no produto. */
export async function enviarImagemProduto(arquivo: File): Promise<string> {
  const extensao = (arquivo.name.split(".").pop() ?? "jpg").toLowerCase();
  const caminho = `${crypto.randomUUID()}.${extensao}`;
  const { error } = await supabase.storage
    .from(BUCKET_PRODUTOS)
    .upload(caminho, arquivo, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return caminho;
}

export async function urlAssinada(caminho: string): Promise<string | null> {
  const [url] = await resolverImagens([caminho]);
  return url ?? null;
}

export async function buscarProdutos(apenasDisponiveis: boolean): Promise<Produto[]> {
  let query = supabase
    .from("produtos")
    .select("id, tipo, nome, descricao, imagem_url, disponivel, precos_produto(id, tamanho, preco)")
    .order("nome", { ascending: true });

  if (apenasDisponiveis) query = query.eq("disponivel", true);

  const { data, error } = await query;
  if (error) throw error;

  const linhas = (data ?? []).map((p) => {
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

  const imagens = await resolverImagens(linhas.map((l) => l.imagem_url));
  return linhas.map((l, i) => ({
    ...l,
    imagem_ref: l.imagem_url,
    imagem_url: imagens[i] ?? null,
  }));
}

export const ORDEM_TAMANHO = ["pequena", "media", "grande"] as const;

export function precosOrdenados(produto: Produto) {
  return [...produto.precos].sort(
    (a, b) =>
      ORDEM_TAMANHO.indexOf(a.tamanho as never) - ORDEM_TAMANHO.indexOf(b.tamanho as never),
  );
}
