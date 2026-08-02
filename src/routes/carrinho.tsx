import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CabecalhoLoja } from "@/components/cabecalho-loja";
import { useCarrinho } from "@/lib/carrinho";
import { IMAGEM_FALLBACK, TAMANHO_LABEL, moeda, type Tamanho } from "@/lib/pedidos";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Carrinho — Pizza Frita Delivery" },
      { name: "description", content: "Revise os itens do seu pedido antes de finalizar." },
      { property: "og:title", content: "Carrinho — Pizza Frita Delivery" },
      { property: "og:description", content: "Revise os itens do seu pedido antes de finalizar." },
    ],
  }),
  component: PaginaCarrinho,
});

function PaginaCarrinho() {
  const { itens, alterarQuantidade, remover, valorTotal } = useCarrinho();

  return (
    <CabecalhoLoja>
      <h1 className="mb-4 text-xl font-bold tracking-tight">Seu carrinho</h1>

      {itens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Seu carrinho está vazio.</p>
          <Button asChild className="mt-4">
            <Link to="/">Ver cardápio</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {itens.map((item) => (
              <li
                key={item.key}
                className="flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm"
              >
                <img
                  src={item.imagem_url || IMAGEM_FALLBACK}
                  alt={item.nome}
                  className="size-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-tight">
                    {item.nome}
                    {item.tamanho && (
                      <span className="text-muted-foreground"> · {TAMANHO_LABEL[item.tamanho as Tamanho]}</span>
                    )}
                  </p>
                  {item.observacoes && (
                    <p className="mt-0.5 text-xs italic text-muted-foreground">
                      {item.observacoes}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-bold text-primary">
                    {moeda(item.preco_unitario * item.quantidade)}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-8"
                      aria-label="Diminuir quantidade"
                      onClick={() => alterarQuantidade(item.key, item.quantidade - 1)}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-8"
                      aria-label="Aumentar quantidade"
                      onClick={() => alterarQuantidade(item.key, item.quantidade + 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="ml-auto size-8 text-destructive"
                      aria-label="Remover item"
                      onClick={() => remover(item.key)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-secondary px-4 py-3">
            <span className="text-sm font-medium text-secondary-foreground">Total</span>
            <span className="text-lg font-extrabold text-primary">{moeda(valorTotal)}</span>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            <Button asChild size="lg" className="flex-1">
              <Link to="/checkout">Ir para o checkout</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="flex-1">
              <Link to="/">Continuar comprando</Link>
            </Button>
          </div>
        </>
      )}
    </CabecalhoLoja>
  );
}
