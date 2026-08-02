import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Clock, MapPin, Phone, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  STATUS_LABEL,
  STATUS_ORDEM,
  TAMANHO_LABEL,
  moeda,
  proximoStatus,
  FORMA_PAGAMENTO_LABEL,
  type ItemPedido,
  type Pedido,
  type StatusPedido,
  type Tamanho,
} from "@/lib/pedidos";
import { liberarAudio, somMudancaStatus, somNovoPedido } from "@/lib/som";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel da cozinha — Pizza Frita" },
      { name: "description", content: "Acompanhe e avance os pedidos em tempo real na cozinha." },
      { property: "og:title", content: "Painel da cozinha — Pizza Frita" },
      { property: "og:description", content: "Acompanhe e avance os pedidos em tempo real." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Painel,
});

function inicioDoDia() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Mostra apenas os pedidos do dia atual — mais pedidos antigos que ainda
 * não foram finalizados (para nada ficar esquecido na cozinha).
 */
async function buscarPedidos(): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .or(`criado_em.gte.${inicioDoDia()},status.neq.finalizado`)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...(p as unknown as Pedido),
    itens: (p.itens as unknown as ItemPedido[]) ?? [],
    valor_total: Number(p.valor_total),
  }));
}


function Painel() {
  const { data: pedidos, isLoading, refetch } = useQuery({
    queryKey: ["pedidos-painel"],
    queryFn: buscarPedidos,
    refetchInterval: 60_000,
  });


  React.useEffect(() => {
    const liberar = () => liberarAudio();
    window.addEventListener("pointerdown", liberar, { once: true });
    return () => window.removeEventListener("pointerdown", liberar);
  }, []);

  React.useEffect(() => {
    const canal = supabase
      .channel("painel-pedidos")
      .on("postgres_changes", { event: "*", schema: "public", table: "pedidos" }, (payload) => {
        if (payload.eventType === "INSERT") {
          somNovoPedido();
          toast.success("Novo pedido recebido!");
        } else if (
          payload.eventType === "UPDATE" &&
          (payload.old as { status?: string } | null)?.status !==
            (payload.new as { status?: string } | null)?.status
        ) {
          somMudancaStatus();
        }
        void refetch();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [refetch]);

  async function avancar(pedido: Pedido) {
    const proximo = proximoStatus(pedido.status);
    if (!proximo) return;
    const { error } = await supabase
      .from("pedidos")
      .update({ status: proximo })
      .eq("id", pedido.id);
    if (error) toast.error("Não foi possível atualizar o status.");
    else void refetch();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary px-6 py-4 text-primary-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Painel da cozinha</h1>
            <p className="text-sm opacity-85">Atualiza automaticamente com novos pedidos</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link to="/vendas" className="rounded-lg bg-primary-foreground/15 px-3 py-2">
              Vendas
            </Link>
            <Link to="/admin" className="rounded-lg bg-primary-foreground/15 px-3 py-2">
              Cadastro
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

      <div className="grid gap-4 p-4 lg:grid-cols-4">
        {STATUS_ORDEM.map((status) => {
          const doStatus = (pedidos ?? []).filter((p) => p.status === status);
          return (
            <section key={status} className="rounded-2xl bg-secondary/60 p-3">
              <h2 className="mb-3 flex items-center justify-between text-base font-bold text-secondary-foreground">
                {STATUS_LABEL[status]}
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {doStatus.length}
                </span>
              </h2>

              <div className="space-y-3">
                {isLoading && <Skeleton className="h-40 rounded-xl" />}
                {!isLoading && doStatus.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    Nenhum pedido
                  </p>
                )}
                {doStatus.map((pedido) => (
                  <CardPedido key={pedido.id} pedido={pedido} onAvancar={avancar} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CardPedido({
  pedido,
  onAvancar,
}: {
  pedido: Pedido;
  onAvancar: (p: Pedido) => void;
}) {
  const proximo = proximoStatus(pedido.status);
  const hora = new Date(pedido.criado_em).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold leading-tight">{pedido.cliente_nome}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="size-3" /> {pedido.cliente_telefone}
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium">
          <Clock className="size-3" /> {hora}
        </span>
      </header>

      <ul className="mt-3 space-y-1.5 text-sm">
        {pedido.itens.map((item, i) => (
          <li key={i}>
            <span className="font-semibold">{item.quantidade}×</span> {item.nome}
            {item.tamanho && (
              <span className="font-medium text-primary">
                {" "}
                ({TAMANHO_LABEL[item.tamanho as Tamanho]})
              </span>
            )}
            {item.observacoes && (
              <em className="block text-xs text-muted-foreground">obs: {item.observacoes}</em>
            )}
          </li>
        ))}
      </ul>

      <p className="mt-3 flex items-start gap-1 text-xs text-muted-foreground">
        {pedido.tipo_entrega === "entrega" ? (
          <>
            <MapPin className="mt-0.5 size-3 shrink-0" /> {pedido.endereco}
          </>
        ) : (
          <>
            <Package className="mt-0.5 size-3 shrink-0" /> Retirada no balcão
          </>
        )}
      </p>

      <p className="mt-1 text-xs font-medium">
        Pagamento: {FORMA_PAGAMENTO_LABEL[pedido.forma_pagamento] ?? pedido.forma_pagamento}
        {pedido.forma_pagamento === "dinheiro" && pedido.troco_para
          ? ` — troco para ${moeda(pedido.troco_para)}`
          : ""}
      </p>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-lg font-extrabold text-primary">{moeda(pedido.valor_total)}</span>
        {proximo ? (
          <Button size="sm" onClick={() => onAvancar(pedido)}>
            {STATUS_LABEL[proximo as StatusPedido]}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <span className="text-xs font-semibold text-success">Concluído</span>
        )}
      </div>
    </article>
  );
}
