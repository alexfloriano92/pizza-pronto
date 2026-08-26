import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, Search } from "lucide-react";
import { useCarrinho } from "@/lib/carrinho";

export function CabecalhoLoja({ children }: { children: React.ReactNode }) {
  const { totalItens } = useCarrinho();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background">
        <div className="mx-auto flex max-w-5xl items-start justify-between gap-3 px-5 pb-3 pt-5">
          <Link to="/" className="block">
            <p className="font-display text-3xl leading-[0.82] text-primary sm:text-4xl">
              Pizza
              <br />
              Frita
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Frita na hora / Ed. 01
            </p>
          </Link>

          <div className="flex items-center gap-2 pt-1">
            {pathname !== "/acompanhar" && (
              <Link
                to="/acompanhar"
                aria-label="Acompanhar pedido"
                className="inline-flex h-10 items-center gap-1.5 border-2 border-foreground px-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-foreground hover:text-background"
              >
                <Search className="size-3.5" />
                <span className="hidden sm:inline">Acompanhar</span>
              </Link>
            )}
            {pathname !== "/carrinho" && (
              <div className="relative">
                <Link
                  to="/carrinho"
                  aria-label="Abrir carrinho"
                  className="relative z-10 inline-flex size-10 items-center justify-center border-2 border-foreground bg-background transition-colors hover:bg-foreground hover:text-background"
                >
                  <ShoppingBag className="size-5" />
                  {totalItens > 0 && (
                    <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                      {totalItens}
                    </span>
                  )}
                </Link>
                <span
                  aria-hidden
                  className="absolute left-1 top-1 z-0 size-10 border border-foreground/20"
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-6">{children}</main>
    </div>
  );
}
