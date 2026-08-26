import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, StoreIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buscarProdutos, precosOrdenados } from "@/lib/consultas";
import { IMAGEM_FALLBACK, TAMANHO_LABEL, moeda, type Produto, type Tamanho } from "@/lib/pedidos";
import { useCarrinho } from "@/lib/carrinho";
import { MENSAGEM_FECHADA_PADRAO, useConfigLoja } from "@/lib/loja";
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

const SITE_URL = "https://project--66412ab3-ba9f-45d4-8383-635d3ef93683.lovable.app";

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
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Restaurant",
          name: "Pizza Frita Delivery",
          servesCuisine: "Pizza frita",
          url: SITE_URL,
          hasMenu: SITE_URL + "/",
          acceptsReservations: false,
          priceRange: "$$",
        }),
      },
    ],
  }),

  component: Cardapio,
});

function Cardapio() {
  const [selecionado, setSelecionado] = React.useState<Produto | null>(null);
  const { data: config } = useConfigLoja();
  const fechada = config ? !config.aberta : false;

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
      {fechada && (
        <div className="-mx-5 mb-8 overflow-hidden bg-primary px-5 py-2 text-primary-foreground">
          <p className="font-display text-[11px] tracking-[0.25em]">
            <StoreIcon className="mr-2 inline size-3.5 align-[-2px]" />
            Estamos fechados — {config?.mensagem?.trim() || MENSAGEM_FECHADA_PADRAO}
          </p>
        </div>
      )}

      <section className="mb-12 border-b-2 border-foreground pb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-accent">
          A casa da massa crocante
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[0.9] sm:text-6xl">
          Pizza frita
          <br />
          <span className="text-primary">feita na hora</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Massa crocante por fora, recheio derretido por dentro. Peça e acompanhe seu pedido em
          tempo real.
        </p>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (
        <>
          <SecaoPizzas titulo="Pizzas" numero="01" itens={pizzas} onSelecionar={setSelecionado} />
          <SecaoBebidas titulo="Bebidas" numero="02" itens={bebidas} onSelecionar={setSelecionado} />
        </>
      )}

      <footer className="-mx-5 mt-16 flex flex-col items-center gap-2 bg-foreground px-5 py-12 text-background">
        <p className="font-display text-lg tracking-[0.1em]">Pizza Frita</p>
        <Link
          to="/painel"
          aria-label="Área da equipe"
          title="Área da equipe"
          className="mt-2 inline-flex size-8 items-center justify-center opacity-30 transition-opacity hover:opacity-70"
        >
          <Lock className="size-3.5" />
        </Link>
        <p className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-30">Conexão segura</p>
      </footer>

      <DialogProduto
        produto={selecionado}
        fechada={fechada}
        onClose={() => setSelecionado(null)}
      />
    </CabecalhoLoja>
  );
}

function CabecalhoSecao({ titulo, numero }: { titulo: string; numero: string }) {
  return (
    <div className="mb-8 flex items-baseline gap-3">
      <h2 className="font-display text-3xl sm:text-4xl">{titulo}</h2>
      <span className="h-[2px] flex-1 bg-foreground/15" />
      <span className="font-display text-sm text-accent">{numero}</span>
    </div>
  );
}

function precoBase(produto: Produto) {
  const precos = precosOrdenados(produto);
  return precos.length ? Math.min(...precos.map((p) => p.preco)) : 0;
}

function SecaoPizzas({
  titulo,
  numero,
  itens,
  onSelecionar,
}: {
  titulo: string;
  numero: string;
  itens: Produto[];
  onSelecionar: (p: Produto) => void;
}) {
  if (itens.length === 0) return null;
  const [heroi, ...resto] = itens;

  return (
    <section className="mb-16">
      <CabecalhoSecao titulo={titulo} numero={numero} />

      {heroi && (
        <button
          onClick={() => onSelecionar(heroi)}
          className="group relative mb-24 block w-full text-left"
        >
          <div className="aspect-[4/3] overflow-hidden sm:aspect-[16/9]">
            <img
              src={heroi.imagem_url || IMAGEM_FALLBACK}
              alt={heroi.nome}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
          <div className="absolute -bottom-10 left-0 right-8 border border-foreground bg-background p-5 shadow-brutal sm:right-auto sm:w-[70%] sm:max-w-md">
            <h3 className="font-display text-xl leading-none sm:text-2xl">{heroi.nome}</h3>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{heroi.descricao}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                a partir de
              </span>
              <span className="font-display text-lg text-primary">{moeda(precoBase(heroi))}</span>
            </div>
          </div>
        </button>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
        {resto.map((produto, i) => (
          <button
            key={produto.id}
            onClick={() => onSelecionar(produto)}
            className={`group block text-left ${i % 2 === 1 ? "pt-6" : ""}`}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={produto.imagem_url || IMAGEM_FALLBACK}
                alt={produto.nome}
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              />
            </div>
            <h3 className="mt-3 font-display text-xs leading-tight">{produto.nome}</h3>
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {produto.descricao}
            </p>
            <span className="mt-2 block text-xs font-bold text-accent">
              {moeda(precoBase(produto))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SecaoBebidas({
  titulo,
  numero,
  itens,
  onSelecionar,
}: {
  titulo: string;
  numero: string;
  itens: Produto[];
  onSelecionar: (p: Produto) => void;
}) {
  if (itens.length === 0) return null;
  return (
    <section className="mb-8">
      <CabecalhoSecao titulo={titulo} numero={numero} />
      <div>
        {itens.map((produto) => (
          <button
            key={produto.id}
            onClick={() => onSelecionar(produto)}
            className="flex w-full items-center justify-between gap-4 border-b border-foreground/10 py-4 text-left transition-colors hover:bg-secondary/60"
          >
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={produto.imagem_url || IMAGEM_FALLBACK}
                alt={produto.nome}
                loading="lazy"
                className="size-12 shrink-0 object-cover"
              />
              <div className="min-w-0">
                <h3 className="font-display text-xs leading-tight">{produto.nome}</h3>
                <p className="truncate text-[11px] text-muted-foreground">{produto.descricao}</p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-bold tracking-tight">
              {moeda(precoBase(produto))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}


function DialogProduto({
  produto,
  fechada,
  onClose,
}: {
  produto: Produto | null;
  fechada: boolean;
  onClose: () => void;
}) {
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

        {produto.tipo === "pizza" && (
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
        )}

        <Button
          size="lg"
          disabled={fechada || (produto.tipo === "pizza" && !tamanho)}
          onClick={() => {
            adicionar({
              produto_id: produto.id,
              nome: produto.nome,
              tipo: produto.tipo,
              tamanho: produto.tipo === "pizza" ? tamanho : null,
              quantidade: 1,
              observacoes: produto.tipo === "pizza" ? obs : "",
              preco_unitario: precoAtual,
              imagem_url: produto.imagem_url,
            });
            toast.success(`${produto.nome} adicionado ao carrinho`);
            onClose();
          }}
        >
          {fechada
            ? "Loja fechada no momento"
            : `Adicionar ao carrinho · ${moeda(precoAtual)}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
