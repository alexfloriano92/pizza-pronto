import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2, Pencil, Plus, Store, StoreIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buscarProdutos, enviarImagemProduto, precosOrdenados, urlAssinada } from "@/lib/consultas";
import { useConfigLoja } from "@/lib/loja";
import { IMAGEM_FALLBACK, TAMANHO_LABEL, moeda, type Produto, type Tamanho } from "@/lib/pedidos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Cadastro de produtos — Pizza Frita" },
      { name: "description", content: "Gerencie pizzas, bebidas, preços e disponibilidade." },
      { property: "og:title", content: "Cadastro de produtos — Pizza Frita" },
      { property: "og:description", content: "Gerencie pizzas, bebidas, preços e disponibilidade." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Rascunho = {
  id?: string;
  tipo: "pizza" | "bebida";
  nome: string;
  descricao: string;
  imagem_url: string;
  previa: string;
  disponivel: boolean;
  precos: { pequena: string; media: string; grande: string; unico: string };
};

const TAMANHOS: Tamanho[] = ["pequena", "media", "grande"];

function rascunhoVazio(tipo: "pizza" | "bebida"): Rascunho {
  return {
    tipo,
    nome: "",
    descricao: "",
    imagem_url: "",
    previa: "",
    disponivel: true,
    precos: { pequena: "", media: "", grande: "", unico: "" },
  };
}

function paraRascunho(p: Produto): Rascunho {
  const buscar = (t: Tamanho) =>
    String(p.precos.find((pr) => pr.tamanho === t)?.preco ?? "");
  return {
    id: p.id,
    tipo: p.tipo,
    nome: p.nome,
    descricao: p.descricao,
    imagem_url: p.imagem_ref ?? "",
    previa: p.imagem_url ?? "",
    disponivel: p.disponivel,
    precos: {
      pequena: buscar("pequena"),
      media: buscar("media"),
      grande: buscar("grande"),
      unico: String(p.precos.find((pr) => pr.tamanho === null)?.preco ?? ""),
    },
  };
}

function Admin() {
  const [rascunho, setRascunho] = React.useState<Rascunho | null>(null);

  const { data: produtos, isLoading, refetch } = useQuery({
    queryKey: ["produtos-admin"],
    queryFn: () => buscarProdutos(false),
  });

  const pizzas = (produtos ?? []).filter((p) => p.tipo === "pizza");
  const bebidas = (produtos ?? []).filter((p) => p.tipo === "bebida");

  async function alternarDisponivel(produto: Produto, valor: boolean) {
    const { error } = await supabase
      .from("produtos")
      .update({ disponivel: valor })
      .eq("id", produto.id);
    if (error) toast.error("Não foi possível atualizar a disponibilidade.");
    else void refetch();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary px-6 py-4 text-primary-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Cadastro de produtos</h1>
            <p className="text-sm opacity-85">Alterações refletem no cardápio na hora</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ChaveLoja />
            <Link to="/painel" className="rounded-lg bg-primary-foreground/15 px-3 py-2">
              Painel
            </Link>
            <Link to="/" className="rounded-lg bg-primary-foreground/15 px-3 py-2">
              Cardápio
            </Link>
            <button
              type="button"
              className="rounded-lg bg-primary-foreground/15 px-3 py-2"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/auth";
              }}
            >
              Sair
            </button>
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setRascunho(rascunhoVazio("pizza"))}>
            <Plus className="size-4" /> Nova pizza
          </Button>
          <Button variant="outline" onClick={() => setRascunho(rascunhoVazio("bebida"))}>
            <Plus className="size-4" /> Nova bebida
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : (
          <>
            <Lista
              titulo="Pizzas fritas"
              itens={pizzas}
              onEditar={(p) => setRascunho(paraRascunho(p))}
              onDisponivel={alternarDisponivel}
            />
            <Lista
              titulo="Bebidas"
              itens={bebidas}
              onEditar={(p) => setRascunho(paraRascunho(p))}
              onDisponivel={alternarDisponivel}
            />
          </>
        )}
      </div>

      <FormularioProduto
        rascunho={rascunho}
        onClose={() => setRascunho(null)}
        onSalvo={() => {
          setRascunho(null);
          void refetch();
        }}
      />
    </div>
  );
}

function Lista({
  titulo,
  itens,
  onEditar,
  onDisponivel,
}: {
  titulo: string;
  itens: Produto[];
  onEditar: (p: Produto) => void;
  onDisponivel: (p: Produto, v: boolean) => void;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold tracking-tight">{titulo}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {itens.map((produto) => (
          <article
            key={produto.id}
            className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
          >
            <img
              src={produto.imagem_url || IMAGEM_FALLBACK}
              alt={produto.nome}
              loading="lazy"
              className="size-20 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{produto.nome}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{produto.descricao}</p>
              <p className="mt-1 text-xs">
                {precosOrdenados(produto)
                  .map((pr) =>
                    pr.tamanho
                      ? `${TAMANHO_LABEL[pr.tamanho as Tamanho]}: ${moeda(pr.preco)}`
                      : moeda(pr.preco),
                  )
                  .join(" · ")}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={produto.disponivel}
                    onCheckedChange={(v) => onDisponivel(produto, v)}
                  />
                  {produto.disponivel ? "Disponível" : "Indisponível"}
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => onEditar(produto)}
                >
                  <Pencil className="size-3.5" /> Editar
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FormularioProduto({
  rascunho,
  onClose,
  onSalvo,
}: {
  rascunho: Rascunho | null;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [form, setForm] = React.useState<Rascunho | null>(rascunho);
  const [salvando, setSalvando] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => setForm(rascunho), [rascunho]);

  async function enviarFoto(arquivo: File) {
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB).");
      return;
    }
    setEnviando(true);
    try {
      const caminho = await enviarImagemProduto(arquivo);
      const previa = (await urlAssinada(caminho)) ?? "";
      setForm((atual) => (atual ? { ...atual, imagem_url: caminho, previa } : atual));
      toast.success("Foto enviada!");
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    } finally {
      setEnviando(false);
    }
  }

  if (!form) return null;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSalvando(true);

    const dados = {
      tipo: form.tipo,
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      imagem_url: form.imagem_url.trim() || IMAGEM_FALLBACK,
      disponivel: form.disponivel,
    };

    let produtoId = form.id;
    if (produtoId) {
      const { error } = await supabase.from("produtos").update(dados).eq("id", produtoId);
      if (error) {
        setSalvando(false);
        toast.error("Erro ao salvar o produto.");
        return;
      }
    } else {
      const { data, error } = await supabase.from("produtos").insert(dados).select("id").single();
      if (error || !data) {
        setSalvando(false);
        toast.error("Erro ao cadastrar o produto.");
        return;
      }
      produtoId = data.id as string;
    }

    await supabase.from("precos_produto").delete().eq("produto_id", produtoId);

    const linhas: { produto_id: string; tamanho: string | null; preco: number }[] =
      form.tipo === "pizza"
        ? TAMANHOS.map((t) => ({
            produto_id: produtoId as string,
            tamanho: t as string | null,
            preco: Number(form.precos[t].replace(",", ".")) || 0,
          }))
        : [
            {
              produto_id: produtoId as string,
              tamanho: null,
              preco: Number(form.precos.unico.replace(",", ".")) || 0,
            },
          ];


    const { error: erroPrecos } = await supabase.from("precos_produto").insert(linhas);
    setSalvando(false);
    if (erroPrecos) {
      toast.error("Produto salvo, mas houve erro nos preços.");
      return;
    }
    toast.success("Produto salvo!");
    onSalvo();
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {form.id ? "Editar" : "Cadastrar"} {form.tipo === "pizza" ? "pizza" : "bebida"}
          </DialogTitle>
          <DialogDescription>
            Preencha as informações que aparecem no cardápio público.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={salvar} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="imagem">Foto do produto</Label>
            <div className="mt-1 flex items-center gap-3">
              <img
                src={form.previa || IMAGEM_FALLBACK}
                alt="Prévia da imagem"
                className="size-20 shrink-0 rounded-xl border border-border object-cover"
              />
              <div className="flex-1">
                <input
                  id="imagem"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0];
                    e.target.value = "";
                    if (arquivo) void enviarFoto(arquivo);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={enviando}
                  onClick={() => document.getElementById("imagem")?.click()}
                >
                  {enviando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  {form.imagem_url ? "Trocar foto" : "Enviar foto"}
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG ou PNG, até 5 MB. Sem foto usamos uma imagem padrão.
                </p>
              </div>
            </div>
          </div>

          {form.tipo === "pizza" ? (
            <div className="grid grid-cols-3 gap-2">
              {TAMANHOS.map((t) => (
                <div key={t}>
                  <Label htmlFor={`preco-${t}`}>{TAMANHO_LABEL[t]}</Label>
                  <Input
                    id={`preco-${t}`}
                    inputMode="decimal"
                    value={form.precos[t]}
                    onChange={(e) =>
                      setForm({ ...form, precos: { ...form.precos, [t]: e.target.value } })
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <div>
              <Label htmlFor="preco-unico">Preço</Label>
              <Input
                id="preco-unico"
                inputMode="decimal"
                value={form.precos.unico}
                onChange={(e) =>
                  setForm({ ...form, precos: { ...form.precos, unico: e.target.value } })
                }
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.disponivel}
              onCheckedChange={(v) => setForm({ ...form, disponivel: v })}
            />
            Disponível no cardápio
          </label>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
