import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buscarProdutos, precosOrdenados } from "@/lib/consultas";
import { IMAGEM_FALLBACK, TAMANHO_LABEL, moeda, type Produto, type Tamanho } from "@/lib/pedidos";
import { useCarrinho } from "@/lib/carrinho";
import { CabecalhoLoja } from "@/components/cabecalho-loja";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cardápio — Pizza Frita Delivery" },
      {
        name: "description",
        content:
          "Cardápio de pizzas fritas artesanais e bebidas geladas. Escolha o tamanho, monte seu pedido e receba em casa.",
      },
      { property: "og:title", content: "Cardápio — Pizza Frita Delivery" },
      {
        property: "og:description",
        content: "Pizzas fritas artesanais e bebidas geladas com entrega ou retirada.",
      },
    ],
  }),
  component: Cardapio,
});

function Cardapio() {
  const [selecionado, setSelecionado] = React.useState<Produto | null>(null);

  const { data: produtos, isLoading, refetch } = useQuery({
    queryKey: ["cardapio"],
    queryFn: () => buscarProdutos(true),
  });

  React.useEffect(() => {
    const canal = supabase
      .channel("cardapio-publico")
      .on("postgres_changes", { event: "*", schema: "public", table: "produtos" }, () => refetch())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "precos_produto" },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [refetch]);

  const pizzas = (produtos ?? []).filter((p) => p.tipo === "pizza");
  const bebidas = (produtos ?? []).filter((p) => p.tipo === "bebida");

  return (
    <CabecalhoLoja>
      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent px-5 py-6 text-primary-foreground">
        <h1 className="text-2xl font-extrabold leading-tight">
          Pizza frita feita na hora
        </h1>
        <p className="mt-1 max-w-md text-sm opacity-90">
          Massa crocante por fora, recheio derretido por dentro. Peça e acompanhe seu pedido em
          tempo real.
        </p>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <SecaoProdutos titulo="Pizzas fritas" itens={pizzas} onSelecionar={setSelecionado} />
          <SecaoProdutos titulo="Bebidas" itens={bebidas} onSelecionar={setSelecionado} />
        </>
      )}

      <p className="mt-12 text-center">
        <Link
          to="/painel"
          aria-label="Área da equipe"
          title="Área da equipe"
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:text-muted-foreground"
        >
          <Lock className="size-3.5" />
        </Link>
      </p>

      <DialogProduto produto={selecionado} onClose={() => setSelecionado(null)} />
    </CabecalhoLoja>
  );
}

function SecaoProdutos({
  titulo,
  itens,
  onSelecionar,
}: {
  titulo: string;
  itens: Produto[];
  onSelecionar: (p: Produto) => void;
}) {
  if (itens.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold tracking-tight">{titulo}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {itens.map((produto) => {
          const precos = precosOrdenados(produto);
          const menor = precos.length ? Math.min(...precos.map((p) => p.preco)) : 0;
          return (
            <button
              key={produto.id}
              onClick={() => onSelecionar(produto)}
              className="flex gap-3 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md"
            >
              <img
                src={produto.imagem_url || IMAGEM_FALLBACK}
                alt={produto.nome}
                loading="lazy"
                className="size-20 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{produto.nome}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {produto.descricao}
                </p>
                <p className="mt-2 text-sm font-bold text-primary">
                  {produto.tipo === "pizza" ? `a partir de ${moeda(menor)}` : moeda(menor)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DialogProduto({ produto, onClose }: { produto: Produto | null; onClose: () => void }) {
  const { adicionar } = useCarrinho();
  const [tamanho, setTamanho] = React.useState<Tamanho | null>(null);
  const [obs, setObs] = React.useState("");

  React.useEffect(() => {
    if (produto) {
      const precos = precosOrdenados(produto);
      setTamanho(produto.tipo === "pizza" ? ((precos[0]?.tamanho ?? null) as Tamanho | null) : null);
      setObs("");
    }
  }, [produto]);

  if (!produto) return null;
  const precos = precosOrdenados(produto);
  const precoAtual =
    produto.tipo === "pizza"
      ? (precos.find((p) => p.tamanho === tamanho)?.preco ?? 0)
      : (precos[0]?.preco ?? 0);

  return (
    <Dialog open={!!produto} onOpenChange={(aberto) => !aberto && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{produto.nome}</DialogTitle>
          <DialogDescription>{produto.descricao}</DialogDescription>
        </DialogHeader>

        <img
          src={produto.imagem_url || IMAGEM_FALLBACK}
          alt={produto.nome}
          className="h-40 w-full rounded-xl object-cover"
        />

        {produto.tipo === "pizza" && (
          <div>
            <Label className="mb-2 block">Tamanho</Label>
            <div className="grid grid-cols-3 gap-2">
              {precos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTamanho(p.tamanho as Tamanho)}
                  className={`rounded-xl border p-2 text-center text-sm transition-colors ${
                    tamanho === p.tamanho
                      ? "border-primary bg-primary/10 font-semibold text-primary"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="block">{TAMANHO_LABEL[p.tamanho as Tamanho]}</span>
                  <span className="block text-xs opacity-80">{moeda(p.preco)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="obs" className="mb-2 block">
            Observações
          </Label>
          <Textarea
            id="obs"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: sem cebola, bem passada..."
            rows={3}
          />
        </div>

        <Button
          size="lg"
          disabled={produto.tipo === "pizza" && !tamanho}
          onClick={() => {
            adicionar({
              produto_id: produto.id,
              nome: produto.nome,
              tipo: produto.tipo,
              tamanho: produto.tipo === "pizza" ? tamanho : null,
              quantidade: 1,
              observacoes: obs,
              preco_unitario: precoAtual,
              imagem_url: produto.imagem_url,
            });
            toast.success(`${produto.nome} adicionado ao carrinho`);
            onClose();
          }}
        >
          Adicionar ao carrinho · {moeda(precoAtual)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
