import * as React from "react";

/**
 * Gerencia o retorno de foco ao abrir/fechar overlays (WCAG 2.4.3 — Ordem de foco).
 * Guarda o elemento que abriu o modal e devolve o foco a ele quando o modal fecha.
 */
export function useRetornoDeFoco() {
  const gatilhoRef = React.useRef<HTMLElement | null>(null);

  const guardarGatilho = React.useCallback(() => {
    gatilhoRef.current = document.activeElement as HTMLElement | null;
  }, []);

  const devolverFoco = React.useCallback(() => {
    const alvo = gatilhoRef.current;
    if (!alvo) return;
    requestAnimationFrame(() => alvo.focus());
  }, []);

  return { gatilhoRef, guardarGatilho, devolverFoco };
}

/**
 * Handler para `onOpenAutoFocus`: foca o container do diálogo em vez do primeiro
 * campo, para o leitor de tela anunciar o título antes dos controles.
 */
export function focarConteudoDoModal(evento: Event) {
  evento.preventDefault();
  (evento.currentTarget as HTMLElement | null)?.focus();
}
