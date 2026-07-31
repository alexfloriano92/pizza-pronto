import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, Pizza, Search } from "lucide-react";
import { useCarrinho } from "@/lib/carrinho";

export function CabecalhoLoja({ children }: { children: React.ReactNode }) {
  const { totalItens } = useCarrinho();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Pizza className="size-6 shrink-0" />
            <div className="leading-tight">
              <p className="text-base font-extrabold tracking-tight">Pizza Frita</p>
              <p className="text-[11px] opacity-80">Quentinha na sua porta</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {pathname !== "/acompanhar" && (
              <Link
                to="/acompanhar"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-2 text-xs font-semibold transition-colors hover:bg-primary-foreground/25"
              >
                <Search className="size-4" />
                <span className="hidden sm:inline">Acompanhar pedido</span>
                <span className="sm:hidden">Pedido</span>
              </Link>
            )}
            {pathname !== "/carrinho" && (
            <Link
              to="/carrinho"
              aria-label="Abrir carrinho"
              className="relative inline-flex size-11 items-center justify-center rounded-full bg-primary-foreground/15 transition-colors hover:bg-primary-foreground/25"
            >
              <ShoppingCart className="size-5" />
              {totalItens > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-foreground">
                  {totalItens}
                </span>
              )}
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-5">{children}</main>
    </div>
  );
}
