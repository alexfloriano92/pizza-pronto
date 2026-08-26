import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, Search } from "lucide-react";
import { useCarrinho } from "@/lib/carrinho";

export function CabecalhoLoja({ children }: { children: React.ReactNode }) {
  const { totalItens } = useCarrinho();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary font-display text-lg leading-none text-primary-foreground">
              PF
            </span>
            <span className="font-display text-lg leading-[0.9] text-primary">
              Pizza
              <br />
              Frita
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {pathname !== "/acompanhar" && (
              <Link
                to="/acompanhar"
                aria-label="Acompanhar pedido"
                className="inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-2 text-xs font-semibold transition-colors hover:bg-secondary"
              >
                <Search className="size-3.5" />
                <span className="hidden sm:inline">Acompanhar</span>
              </Link>
            )}
            {pathname !== "/carrinho" && (
              <Link
                to="/carrinho"
                aria-label="Abrir carrinho"
                className="relative inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
              >
                <ShoppingCart className="size-5" />
                {totalItens > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border-2 border-background bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                    {totalItens}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-4">{children}</main>
    </div>
  );
}
