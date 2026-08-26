import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, Plus, Clock, Flame, BikeIcon } from "lucide-react";
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

function precoBase(produto: Produto) {
  const precos = precosOrdenados(produto);
  return precos.length ? Math.min(...precos.map((p) => p.preco)) : 0;
}

/** Preço cheio do tamanho grande (usado como referência na promoção). */
function precoGrande(produto: Produto) {
  const precos = precosOrdenados(produto);
  return precos.find((p) => p.tamanho === "grande")?.preco ?? precoBase(produto);
}

function precoVigente(produto: Produto) {
  return produto.promocao && produto.preco_promocional != null
    ? produto.preco_promocional
    : precoBase(produto);
}

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
  const promocao = pizzas.find((p) => p.promocao) ?? null;

  return (
    <CabecalhoLoja>
      {fechada && (
        <div className="-mx-4 mb-4 flex items-center justify-center gap-2 bg-accent px-4 py-2 text-accent-foreground">
          <Clock className="size-4" />
          <p className="text-[11px] font-bold uppercase tracking-wider">
            Loja fechada — {config?.mensagem?.trim() || MENSAGEM_FECHADA_PADRAO}
          </p>
        </div>
      )}

      {/* Hero — aspect-ratio fixa evita CLS; altura limitada em telas largas */}
      <section className="mb-6">
        <div className="relative aspect-[4/3] max-h-[22rem] w-full overflow-hidden rounded-3xl bg-foreground sm:aspect-[21/9]">
          <img
            src={promocao?.imagem_url || pizzas[0]?.imagem_url || IMAGEM_FALLBACK}
            alt="Pizza frita quentinha"
            className="size-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />
          <div className="absolute inset-x-[5%] bottom-[6%]">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[0.625rem] font-bold uppercase tracking-wider text-primary-foreground">
              <Flame className="size-3 shrink-0" /> Frita na hora
            </span>
            <h1 className="mt-2 font-display text-fluid-hero text-background">
              A melhor pizza frita
              <br />
              <span className="text-accent">da cidade.</span>
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-background/80">
              <BikeIcon className="size-3.5 shrink-0" /> Entrega rápida ou retirada no balcão
            </p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {promocao && <PromocaoDoDia produto={promocao} onSelecionar={setSelecionado} />}
          <SecaoPizzas itens={pizzas} onSelecionar={setSelecionado} />
          <SecaoBebidas itens={bebidas} onSelecionar={setSelecionado} />
        </>
      )}

      <footer className="mt-12 flex flex-col items-center gap-2 py-10 opacity-50">
        <p className="font-display text-base text-primary">Pizza Frita</p>
        <Link
          to="/painel"
          aria-label="Área da equipe"
          title="Área da equipe"
          className="inline-flex size-8 items-center justify-center opacity-60 transition-opacity hover:opacity-100"
        >
          <Lock className="size-3.5" />
        </Link>
        <p className="text-[9px] font-bold uppercase tracking-[0.3em]">Conexão segura</p>
      </footer>

      <DialogProduto
        produto={selecionado}
        fechada={fechada}
        onClose={() => setSelecionado(null)}
      />
    </CabecalhoLoja>
  );
}

function TituloSecao({ titulo, etiqueta }: { titulo: string; etiqueta?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-xl tracking-tight text-primary">{titulo}</h2>
      {etiqueta && (
        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
          {etiqueta}
        </span>
      )}
    </div>
  );
}

function BotaoAdicionar({ tamanho = "md" }: { tamanho?: "sm" | "md" }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground ${
        tamanho === "sm" ? "size-7" : "size-9"
      }`}
    >
      <Plus className={tamanho === "sm" ? "size-4" : "size-5"} strokeWidth={3} />
    </span>
  );
}

function PromocaoDoDia({
  produto,
  onSelecionar,
}: {
  produto: Produto;
  onSelecionar: (p: Produto) => void;
}) {
  const promo = produto.preco_promocional;
  const cheio = precoGrande(produto);
  const desconto =
    promo != null && cheio > promo ? Math.round(((cheio - promo) / cheio) * 100) : 0;

  return (
    <section className="mb-8">
      <TituloSecao titulo="Promoção do dia" etiqueta="Só hoje" />
      <button
        onClick={() => onSelecionar(produto)}
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-card p-2.5 text-left shadow-brutal-sm transition-transform hover:-translate-y-0.5 sm:gap-4 sm:p-4"
      >
        <div className="relative shrink-0">
          <img
            src={produto.imagem_url || IMAGEM_FALLBACK}
            alt={produto.nome}
            className="size-16 rounded-xl object-cover sm:size-24"
          />
          {desconto > 0 && (
            <span className="absolute -right-1.5 -top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground shadow sm:text-[11px]">
              -{desconto}%
            </span>
          )}
        </div>

        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-accent sm:text-[11px]">
            <Flame className="size-3 shrink-0" /> Só hoje · Grande
          </span>
          <h3 className="truncate text-sm font-bold leading-tight sm:text-base">{produto.nome}</h3>
          <span className="flex flex-wrap items-baseline gap-x-2">
            {promo != null && cheio > promo && (
              <span className="text-[11px] text-muted-foreground line-through sm:text-sm">
                {moeda(cheio)}
              </span>
            )}
            <span className="font-display text-base text-primary sm:text-xl">
              {moeda(precoVigente(produto))}
            </span>
          </span>
        </div>

        <span className="shrink-0">
          <BotaoAdicionar tamanho="sm" />
        </span>
      </button>
    </section>
  );
}

function SecaoPizzas({
  itens,
  onSelecionar,
}: {
  itens: Produto[];
  onSelecionar: (p: Produto) => void;
}) {
  if (itens.length === 0) return null;
  const [destaque, ...resto] = itens;

  return (
    <section className="mb-8">
      <TituloSecao titulo="Pizzas" etiqueta="Tradicionais" />

      {destaque && (
        <button
          onClick={() => onSelecionar(destaque)}
          className="mb-4 flex w-full gap-4 rounded-2xl border border-foreground/10 bg-card p-4 text-left shadow-brutal-sm transition-transform hover:-translate-y-0.5"
        >
          <img
            src={destaque.imagem_url || IMAGEM_FALLBACK}
            alt={destaque.nome}
            className="size-28 shrink-0 rounded-xl object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <h3 className="font-bold leading-tight">{destaque.nome}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">{destaque.descricao}</p>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-bold text-primary">{moeda(precoVigente(destaque))}</span>
              <BotaoAdicionar />
            </div>
          </div>
        </button>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {resto.map((produto) => (
          <button
            key={produto.id}
            onClick={() => onSelecionar(produto)}
            className="flex flex-col rounded-2xl border border-foreground/10 bg-card p-3 text-left shadow-brutal-sm transition-transform hover:-translate-y-0.5"
          >
            <img
              src={produto.imagem_url || IMAGEM_FALLBACK}
              alt={produto.nome}
              loading="lazy"
              className="mb-3 aspect-square w-full rounded-xl object-cover"
            />
            <h3 className="mb-1 text-sm font-bold leading-snug">{produto.nome}</h3>
            <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{produto.descricao}</p>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-sm font-bold text-primary">{moeda(precoVigente(produto))}</span>
              <BotaoAdicionar tamanho="sm" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function SecaoBebidas({
  itens,
  onSelecionar,
}: {
  itens: Produto[];
  onSelecionar: (p: Produto) => void;
}) {
  if (itens.length === 0) return null;
  return (
    <section className="mb-8">
      <TituloSecao titulo="Bebidas" etiqueta="Geladas" />
      <div className="space-y-3">
        {itens.map((produto) => (
          <button
            key={produto.id}
            onClick={() => onSelecionar(produto)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-card px-3 py-3 text-left shadow-brutal-sm transition-transform hover:-translate-y-0.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={produto.imagem_url || IMAGEM_FALLBACK}
                alt={produto.nome}
                loading="lazy"
                className="size-12 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{produto.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{produto.descricao}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-sm font-bold text-primary">{moeda(precoVigente(produto))}</span>
              <BotaoAdicionar tamanho="sm" />
            </div>
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
      const promocional = produto.promocao && produto.preco_promocional != null;
      setTamanho(
        produto.tipo === "pizza"
          ? promocional
            ? "grande"
            : ((precos[0]?.tamanho ?? null) as Tamanho | null)
          : null,
      );
      setObs("");
    }
  }, [produto]);

  if (!produto) return null;
  const precos = precosOrdenados(produto);
  const emPromocao = produto.promocao && produto.preco_promocional != null;
  const precoAtual = emPromocao
    ? (produto.preco_promocional as number)
    : produto.tipo === "pizza"
      ? (precos.find((p) => p.tamanho === tamanho)?.preco ?? 0)
      : (precos[0]?.preco ?? 0);

  return (
    <Dialog open={!!produto} onOpenChange={(aberto) => !aberto && onClose()}>
      {/* Mobile: quase tela cheia com scroll interno (overscroll-contain evita rolar o fundo) */}
      <DialogContent className="max-h-[90svh] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto overscroll-contain rounded-2xl">
        <DialogHeader>
          <DialogTitle>{produto.nome}</DialogTitle>
          <DialogDescription>{produto.descricao}</DialogDescription>
        </DialogHeader>

        <img
          src={produto.imagem_url || IMAGEM_FALLBACK}
          alt={produto.nome}
          className="h-40 w-full rounded-2xl object-cover"
        />

        {emPromocao && (
          <p className="rounded-xl bg-accent/15 px-3 py-2 text-xs font-bold text-accent">
            Promoção do dia — tamanho único Grande por {moeda(precoAtual)}
          </p>
        )}

        {produto.tipo === "pizza" && !emPromocao && (
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
