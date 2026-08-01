import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Clock, Phone, User, ArrowLeft, Navigation, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CabecalhoLoja } from "@/components/cabecalho-loja";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  moeda,
  type ItemPedido,
  type Pedido,
  type StatusPedido,
  STATUS_LABEL,
  TAMANHO_LABEL,
  type Tamanho,
} from "@/lib/pedidos";


export const Route = createFileRoute("/rastreio/$id")({
  head: () => ({
    meta: [
      { title: "Rastreamento da entrega — Pizza Frita" },
      {
        name: "description",
        content: "Acompanhe a entrega do seu pedido de pizza frita.",
      },
      { property: "og:title", content: "Rastreamento da entrega — Pizza Frita" },
      {
        property: "og:description",
        content: "Veja onde está seu pedido e quando chega.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RastreamentoEntrega,
});

async function buscarPedido(id: string): Promise<Pedido | null> {
  const { data, error } = await supabase.rpc("pedido_publico", { _id: id });
  if (error) throw error;
  const registro = (data ?? [])[0];
  if (!registro) return null;
  return {
    ...(registro as unknown as Pedido),
    itens: (registro.itens as unknown as ItemPedido[]) ?? [],
    valor_total: Number(registro.valor_total),
  };
}

function RastreamentoEntrega() {
  const { id } = Route.useParams();

  const { data: pedido, isLoading } = useQuery({
    queryKey: ["pedido", id],
    queryFn: () => buscarPedido(id),
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <CabecalhoLoja>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </CabecalhoLoja>
    );
  }

  if (!pedido) {
    return (
      <CabecalhoLoja>
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Pedido não encontrado.</p>
          <Button asChild className="mt-4">
            <Link to="/">Ir para o cardápio</Link>
          </Button>
        </div>
      </CabecalhoLoja>
    );
  }

  const codigoPedido = pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase();
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    pedido.endereco ?? "",
  )}`;

  return (
    <CabecalhoLoja>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link to="/pedido/$id" params={{ id }}>
          <ArrowLeft className="mr-1 size-4" />
          Voltar ao pedido
        </Link>
      </Button>

      <div className="rounded-2xl border-2 border-primary bg-primary/10 p-5 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Navigation className="size-7" />
        </div>
        <h1 className="mt-3 text-lg font-bold text-foreground">Saiu para entrega</h1>
        <p className="text-sm text-muted-foreground">
          Seu pedido <span className="font-mono font-bold text-primary">{codigoPedido}</span> está a caminho
        </p>
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Entregador
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <User className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">João — Motoboy Pizza Frita</p>
            <p className="text-xs text-muted-foreground">Honda CG 160 • Branca</p>
          </div>
          <a
            href="tel:+5500000000000"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-accent"
            aria-label="Ligar para o entregador"
          >
            <Phone className="size-4" />
          </a>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Endereço de entrega
        </h2>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-sm leading-relaxed text-foreground">{pedido.endereco}</p>
        </div>
        <Button asChild className="mt-4 w-full" variant="outline">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Navigation className="mr-2 size-4" />
            Abrir endereço no mapa
          </a>
        </Button>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Previsão
        </h2>
        <div className="flex items-center gap-3">
          <Clock className="size-5 text-primary" />
          <div>
            <p className="text-sm font-bold text-foreground">Chega em até 25 minutos</p>
            <p className="text-xs text-muted-foreground">Tempo estimado pode variar com o trânsito</p>
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Resumo do pedido
        </h2>
        <ul className="space-y-2 text-sm">
          {pedido.itens.map((item, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>
                {item.quantidade}× {item.nome}
                {item.tamanho && ` (${TAMANHO_LABEL[item.tamanho as Tamanho]})`}
              </span>
              <span className="font-medium">{moeda(item.preco_unitario * item.quantidade)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold">
          <span>Total</span>
          <span className="text-primary">{moeda(pedido.valor_total)}</span>
        </div>
      </section>
    </CabecalhoLoja>
  );
}
