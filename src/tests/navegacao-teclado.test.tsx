import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { focarConteudoDoModal, useRetornoDeFoco } from "@/lib/foco";

/**
 * Réplica mínima do contrato de foco usado no cardápio: cabeçalho → lista de
 * produtos → rodapé, com modal que devolve o foco ao card que o abriu.
 */
function Cardapio() {
  const [aberto, setAberto] = React.useState<string | null>(null);
  const { guardarGatilho, devolverFoco } = useRetornoDeFoco();

  const abrir = (nome: string) => {
    guardarGatilho();
    setAberto(nome);
  };
  const fechar = () => {
    setAberto(null);
    devolverFoco();
  };

  return (
    <div>
      <a href="#conteudo">Pular para o conteúdo</a>
      <a href="/acompanhar">Acompanhar pedido</a>
      <a href="/carrinho">Abrir carrinho</a>

      <main id="conteudo" tabIndex={-1}>
        {["Mussarela", "Calabresa"].map((nome) => (
          <button key={nome} onClick={() => abrir(nome)} aria-label={`${nome}. Abrir opções`}>
            <span aria-hidden="true">+</span>
          </button>
        ))}
      </main>

      <footer>
        <a href="/painel" aria-label="Área da equipe">
          Equipe
        </a>
      </footer>

      <Dialog open={!!aberto} onOpenChange={(v) => !v && fechar()}>
        <DialogContent onOpenAutoFocus={focarConteudoDoModal} tabIndex={-1}>
          <DialogHeader>
            <DialogTitle>{aberto}</DialogTitle>
            <DialogDescription>Escolha o tamanho</DialogDescription>
          </DialogHeader>
          <button>Adicionar ao carrinho</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function rotulo(el: Element | null) {
  return el?.getAttribute("aria-label") ?? el?.textContent?.trim() ?? "";
}

describe("navegação por teclado", () => {
  it("mantém a ordem de foco entre cabeçalho, cardápio e rodapé", async () => {
    const user = userEvent.setup();
    render(<Cardapio />);

    const ordem: string[] = [];
    for (let i = 0; i < 6; i++) {
      await user.tab();
      ordem.push(rotulo(document.activeElement));
    }

    expect(ordem).toEqual([
      "Pular para o conteúdo",
      "Acompanhar pedido",
      "Abrir carrinho",
      "Mussarela. Abrir opções",
      "Calabresa. Abrir opções",
      "Área da equipe",
    ]);
  });

  it("o primeiro tab alcança o atalho para o conteúdo principal, que existe na página", async () => {
    const user = userEvent.setup();
    render(<Cardapio />);
    await user.tab();
    const atalho = document.activeElement as HTMLAnchorElement;
    expect(atalho).toHaveTextContent("Pular para o conteúdo");
    expect(document.querySelector("#conteudo")).toBeInTheDocument();
  });

  it("abre o modal focando o container e não o primeiro campo", async () => {
    const user = userEvent.setup();
    render(<Cardapio />);

    await user.click(screen.getByLabelText("Calabresa. Abrir opções"));
    const dialogo = await screen.findByRole("dialog");
    await waitFor(() => expect(document.activeElement).toBe(dialogo));
  });

  it("prende o foco dentro do modal", async () => {
    const user = userEvent.setup();
    render(<Cardapio />);

    await user.click(screen.getByLabelText("Mussarela. Abrir opções"));
    const dialogo = await screen.findByRole("dialog");

    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialogo.contains(document.activeElement)).toBe(true);
    }
  });

  it("devolve o foco ao card de origem ao fechar com Esc", async () => {
    const user = userEvent.setup();
    render(<Cardapio />);

    const gatilho = screen.getByLabelText("Calabresa. Abrir opções");
    await user.click(gatilho);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(document.activeElement).toBe(gatilho));
  });

  it("ícones decorativos não são anunciados nem focáveis", async () => {
    render(<Cardapio />);
    document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
      expect(el.querySelector("a, button, input, [tabindex]")).toBeNull();
    });
  });
});
