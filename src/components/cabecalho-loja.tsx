import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingCart, Search } from "lucide-react";
import { useCarrinho } from "@/lib/carrinho";

export function CabecalhoLoja({ children }: { children: React.ReactNode }) {
  const { totalItens } = useCarrinho();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    /* min-h-dvh respeita a barra do navegador mobile; overflow-x-hidden trava scroll lateral */
    <div className="min-h-dvh overflow-x-hidden bg-background">
      {/* Atalho para teclado/leitor de tela: só aparece ao receber foco */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2">

          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg leading-none text-primary-foreground">
              PF
            </span>
            <span className="truncate font-display text-lg leading-[0.9] text-primary">
              Pizza
              <br />
              Frita
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {pathname !== "/acompanhar" && (
              <Link
                to="/acompanhar"
                aria-label="Acompanhar pedido"
                className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-foreground/15 px-3 text-xs font-semibold transition-colors hover:bg-secondary"
              >
                <Search className="size-4 shrink-0" />
                <span className="hidden sm:inline">Acompanhar</span>
              </Link>
            )}
            {pathname !== "/carrinho" && (
              <Link
                to="/carrinho"
                aria-label="Abrir carrinho"
                className="relative inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
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
