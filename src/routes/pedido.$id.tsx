import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CabecalhoLoja } from "@/components/cabecalho-loja";
import {
  STATUS_LABEL,
  STATUS_ORDEM,
  TAMANHO_LABEL,
  moeda,
  type ItemPedido,
  type Pedido,
  type StatusPedido,
  type Tamanho,
} from "@/lib/pedidos";
import { somMudancaStatus, somBuzinaMoto, vibrarEntrega } from "@/lib/som";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Acompanhe seu pedido — Pizza Frita" },
      {
        name: "description",
        content: "Acompanhe em tempo real o preparo e a entrega do seu pedido de pizza frita.",
      },
      { property: "og:title", content: "Acompanhe seu pedido — Pizza Frita" },
      {
        property: "og:description",
        content: "Acompanhe em tempo real o preparo e a entrega do seu pedido.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcompanharPedido,
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

function AcompanharPedido() {
  const { id } = Route.useParams();
  const [permissao, setPermissao] = React.useState<NotificationPermission | "indisponivel">(
    "default",
  );
  const statusAnterior = React.useRef<StatusPedido | null>(null);
  const [aviso, setAviso] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 12000);
    return () => clearTimeout(t);
  }, [aviso]);

  const queryClient = useQueryClient();

  const { data: pedido, isLoading, refetch } = useQuery({
    queryKey: ["pedido", id],
    queryFn: () => buscarPedido(id),
    refetchOnWindowFocus: true,
  });

  // Tempo real: o banco emite um broadcast no canal do pedido a cada mudança de status.
  React.useEffect(() => {
    const canal = supabase
      .channel(`pedido-${id.replace(/-/g, "")}`)
      .on("broadcast", { event: "status" }, (mensagem) => {
        const novo = (mensagem["payload"] as { record?: { status?: StatusPedido } })?.record?.status
          ?? (mensagem["payload"] as { status?: StatusPedido })?.status;
        if (!novo) {
          void refetch();
          return;
        }
        queryClient.setQueryData(["pedido", id], (atual: Pedido | null | undefined) =>
          atual ? { ...atual, status: novo } : atual,
        );
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [id, queryClient, refetch]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermissao("indisponivel");
      return;
    }
    setPermissao(Notification.permission);
    if (Notification.permission === "default") {
      void Notification.requestPermission().then(setPermissao);
    }
  }, []);

  React.useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => document.removeEventListener("visibilitychange", aoVoltar);
  }, [refetch]);



  React.useEffect(() => {
    if (!pedido) return;
    const anterior = statusAnterior.current;
    statusAnterior.current = pedido.status;
    if (!anterior || anterior === pedido.status) return;
    if (pedido.status === "saiu_para_entrega") {
      somBuzinaMoto();
      vibrarEntrega();
    } else {
      somMudancaStatus();
    }
    // Aviso visual na própria tela do cliente
    setAviso(STATUS_LABEL[pedido.status]);
    toast.success("Seu pedido foi atualizado", {
      description: `Agora está: ${STATUS_LABEL[pedido.status]}`,
      duration: 8000,
    });
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission !== "granted") return;
    try {
      new Notification("Pizza Frita — atualização do pedido", {
        body: `Seu pedido agora está: ${STATUS_LABEL[pedido.status]}`,
        tag: `pedido-${pedido.id}`,
      });
    } catch {
      /* navegador pode bloquear */
    }
  }, [pedido]);

  if (isLoading) {
    return (
      <CabecalhoLoja>
        <Skeleton className="h-64 w-full rounded-2xl" />
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

  const indiceAtual = STATUS_ORDEM.indexOf(pedido.status);

  return (
    <CabecalhoLoja>
      {aviso && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-start gap-3 rounded-2xl border-2 border-primary bg-primary/15 p-4 shadow-sm animate-in fade-in slide-in-from-top-2"
        >
          <Bell className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-bold text-primary">Seu pedido foi atualizado!</p>
            <p className="text-sm text-foreground">Agora está: {aviso}</p>
          </div>
          <button
            type="button"
            onClick={() => setAviso(null)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Fechar
          </button>
        </div>
      )}

      <h1 className="text-xl font-bold tracking-tight">Acompanhe seu pedido</h1>
      <p className="mt-1 text-xs text-muted-foreground">Olá, {pedido.cliente_nome}!</p>

      <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Código do pedido
        </p>
        <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.3em] text-primary">
          {pedido.id.replace(/-/g, "").slice(0, 8).toUpperCase()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Guarde este código para consultar seu pedido em “Acompanhar pedido”.
        </p>
      </div>


      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <ol className="space-y-1">
          {STATUS_ORDEM.map((status, i) => {
            const concluido = i < indiceAtual;
            const atual = i === indiceAtual;
            return (
              <li key={status} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                      atual
                        ? "border-primary bg-primary text-primary-foreground"
                        : concluido
                          ? "border-success bg-success text-success-foreground"
                          : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {concluido ? <Check className="size-4" /> : i + 1}
                  </span>
                  {i < STATUS_ORDEM.length - 1 && (
                    <span
                      className={`my-0.5 w-0.5 flex-1 rounded ${
                        concluido ? "bg-success" : "bg-border"
                      }`}
                      style={{ minHeight: 24 }}
                    />
                  )}
                </div>
                <div className="pb-4">
                  <p
                    className={`text-sm ${
                      atual
                        ? "font-bold text-primary"
                        : concluido
                          ? "font-medium text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABEL[status]}
                  </p>
                  {atual && (
                    <p className="text-xs text-muted-foreground">Etapa atual do seu pedido</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
        {permissao === "granted" ? (
          <>
            <Bell className="size-4" /> Você receberá notificações a cada mudança de status.
          </>
        ) : (
          <>
            <BellOff className="size-4" /> Notificações desativadas — acompanhe por esta página, ela
            atualiza sozinha.
          </>
        )}
      </div>

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
                {item.observacoes && (
                  <em className="block text-xs text-muted-foreground">{item.observacoes}</em>
                )}
              </span>
              <span className="font-medium">
                {moeda(item.preco_unitario * item.quantidade)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold">
          <span>Total</span>
          <span className="text-primary">{moeda(pedido.valor_total)}</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {pedido.tipo_entrega === "entrega"
            ? `Entrega em: ${pedido.endereco}`
            : "Retirada no balcão"}
        </p>
      </section>

      <div className="mt-6">
        <Button asChild variant="outline" className="w-full">
          <Link to="/">Fazer outro pedido</Link>
        </Button>
      </div>
    </CabecalhoLoja>
  );
}
