import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, DollarSign, Receipt, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_LABEL,
  moeda,
  type FormaPagamento,
  type ItemPedido,
  type Pedido,
  type StatusPedido,
} from "@/lib/pedidos";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({
    meta: [
      { title: "Dashboard de vendas — Pizza Frita" },
      {
        name: "description",
        content: "Faturamento, ticket médio e produtos mais vendidos da pizzaria.",
      },
      { property: "og:title", content: "Dashboard de vendas — Pizza Frita" },
      { property: "og:description", content: "Resumo financeiro e produtos mais vendidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Vendas,
});

type Periodo = "hoje" | "7" | "30" | "90" | "tudo" | "personalizado";

const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: "hoje", label: "Hoje" },
  { valor: "7", label: "7 dias" },
  { valor: "30", label: "30 dias" },
  { valor: "90", label: "90 dias" },
  { valor: "tudo", label: "Tudo" },
  { valor: "personalizado", label: "Por data" },
];

async function buscarVendas(): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from("pedidos")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    ...(p as unknown as Pedido),
    itens: (p.itens as unknown as ItemPedido[]) ?? [],
    valor_total: Number(p.valor_total),
  }));
}

function diaLabel(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function Vendas() {
  const [periodo, setPeriodo] = React.useState<Periodo>("30");
  const { data, isLoading } = useQuery({ queryKey: ["vendas"], queryFn: buscarVendas });

  const pedidos = React.useMemo(() => {
    const todos = data ?? [];
    if (periodo === "tudo") return todos;
    const limite = Date.now() - Number(periodo) * 24 * 60 * 60 * 1000;
    return todos.filter((p) => new Date(p.criado_em).getTime() >= limite);
  }, [data, periodo]);

  const resumo = React.useMemo(() => {
    const concluidos = pedidos.filter((p) => p.status !== "recebido" || true);
    const faturamento = pedidos.reduce((s, p) => s + p.valor_total, 0);
    const finalizados = pedidos.filter((p) => p.status === "finalizado");
    const faturamentoFinalizado = finalizados.reduce((s, p) => s + p.valor_total, 0);
    const itensVendidos = pedidos.reduce(
      (s, p) => s + p.itens.reduce((a, i) => a + (i.quantidade ?? 0), 0),
      0,
    );

    const porStatus = new Map<StatusPedido, number>();
    const porPagamento = new Map<FormaPagamento, { qtd: number; total: number }>();
    const porProduto = new Map<string, { qtd: number; total: number }>();
    const porDia = new Map<string, number>();

    for (const p of concluidos) {
      porStatus.set(p.status, (porStatus.get(p.status) ?? 0) + 1);

      const fp = (p.forma_pagamento ?? "dinheiro") as FormaPagamento;
      const atualFp = porPagamento.get(fp) ?? { qtd: 0, total: 0 };
      porPagamento.set(fp, { qtd: atualFp.qtd + 1, total: atualFp.total + p.valor_total });

      const dia = p.criado_em.slice(0, 10);
      porDia.set(dia, (porDia.get(dia) ?? 0) + p.valor_total);

      for (const item of p.itens) {
        const chave = item.tamanho ? `${item.nome} (${item.tamanho})` : item.nome;
        const atual = porProduto.get(chave) ?? { qtd: 0, total: 0 };
        porProduto.set(chave, {
          qtd: atual.qtd + item.quantidade,
          total: atual.total + item.quantidade * item.preco_unitario,
        });
      }
    }

    const dias = Array.from(porDia.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
    const topProdutos = Array.from(porProduto.entries())
      .sort((a, b) => b[1].qtd - a[1].qtd)
      .slice(0, 8);

    return {
      faturamento,
      faturamentoFinalizado,
      total: pedidos.length,
      ticket: pedidos.length ? faturamento / pedidos.length : 0,
      itensVendidos,
      porStatus,
      porPagamento: Array.from(porPagamento.entries()),
      dias,
      topProdutos,
      maiorDia: Math.max(1, ...dias.map(([, v]) => v)),
    };
  }, [pedidos]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-primary px-6 py-4 text-primary-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Dashboard de vendas</h1>
            <p className="text-sm opacity-85">Visível apenas para administradores</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link to="/painel" className="rounded-lg bg-primary-foreground/15 px-3 py-2">
              Cozinha
            </Link>
            <Link to="/admin" className="rounded-lg bg-primary-foreground/15 px-3 py-2">
              Cadastro
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

      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.valor}
              type="button"
              onClick={() => setPeriodo(p.valor)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                periodo === p.valor
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Cartao
                icone={<DollarSign className="h-5 w-5" />}
                titulo="Faturamento"
                valor={moeda(resumo.faturamento)}
                nota={`${moeda(resumo.faturamentoFinalizado)} já finalizados`}
              />
              <Cartao
                icone={<Receipt className="h-5 w-5" />}
                titulo="Pedidos"
                valor={String(resumo.total)}
                nota={`${resumo.itensVendidos} itens vendidos`}
              />
              <Cartao
                icone={<TrendingUp className="h-5 w-5" />}
                titulo="Ticket médio"
                valor={moeda(resumo.ticket)}
                nota="Por pedido no período"
              />
              <Cartao
                icone={<BarChart3 className="h-5 w-5" />}
                titulo="Finalizados"
                valor={String(resumo.porStatus.get("finalizado") ?? 0)}
                nota={`${resumo.porStatus.get("recebido") ?? 0} aguardando preparo`}
              />
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-lg font-bold">Faturamento por dia</h2>
              {resumo.dias.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nenhuma venda no período.</p>
              ) : (
                <div className="mt-5 flex h-48 items-end gap-2">
                  {resumo.dias.map(([dia, valor]) => (
                    <div key={dia} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {moeda(valor)}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-primary transition-all"
                        style={{ height: `${Math.max(4, (valor / resumo.maiorDia) * 100)}%` }}
                        title={`${diaLabel(dia)}: ${moeda(valor)}`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {diaLabel(`${dia}T12:00:00`)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-lg font-bold">Mais vendidos</h2>
                <ul className="mt-4 space-y-3">
                  {resumo.topProdutos.length === 0 && (
                    <li className="text-sm text-muted-foreground">Sem dados no período.</li>
                  )}
                  {resumo.topProdutos.map(([nome, info]) => (
                    <li key={nome} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{nome}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {info.qtd}x · {moeda(info.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-6">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-lg font-bold">Formas de pagamento</h2>
                  <ul className="mt-4 space-y-3">
                    {resumo.porPagamento.length === 0 && (
                      <li className="text-sm text-muted-foreground">Sem dados no período.</li>
                    )}
                    {resumo.porPagamento.map(([forma, info]) => (
                      <li key={forma} className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {FORMA_PAGAMENTO_LABEL[forma] ?? forma}
                        </span>
                        <span className="text-muted-foreground">
                          {info.qtd} pedidos · {moeda(info.total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <h2 className="text-lg font-bold">Pedidos por status</h2>
                  <ul className="mt-4 space-y-3">
                    {(Object.keys(STATUS_LABEL) as StatusPedido[]).map((s) => (
                      <li key={s} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{STATUS_LABEL[s]}</span>
                        <span className="text-muted-foreground">
                          {resumo.porStatus.get(s) ?? 0}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Cartao({
  icone,
  titulo,
  valor,
  nota,
}: {
  icone: React.ReactNode;
  titulo: string;
  valor: string;
  nota: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icone}
        <span className="text-sm font-medium">{titulo}</span>
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{nota}</p>
    </div>
  );
}
