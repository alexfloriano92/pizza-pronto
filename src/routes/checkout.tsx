import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CabecalhoLoja } from "@/components/cabecalho-loja";
import { useCarrinho } from "@/lib/carrinho";
import { TAMANHO_LABEL, moeda, type Tamanho } from "@/lib/pedidos";
import { liberarAudio } from "@/lib/som";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Pizza Frita Delivery" },
      { name: "description", content: "Informe seus dados e confirme o pedido de pizza frita." },
      { property: "og:title", content: "Checkout — Pizza Frita Delivery" },
      {
        property: "og:description",
        content: "Informe seus dados e confirme o pedido de pizza frita.",
      },
    ],
  }),
  component: PaginaCheckout,
});

function PaginaCheckout() {
  const navigate = useNavigate();
  const { itens, valorTotal, limpar } = useCarrinho();
  const [nome, setNome] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [tipoEntrega, setTipoEntrega] = React.useState<"retirada" | "entrega">("entrega");
  const [rua, setRua] = React.useState("");
  const [numero, setNumero] = React.useState("");
  const [bairro, setBairro] = React.useState("");
  const [cidade, setCidade] = React.useState("");
  const [complemento, setComplemento] = React.useState("");
  const [formaPagamento, setFormaPagamento] = React.useState<FormaPagamento>("pix");
  const [trocoPara, setTrocoPara] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    liberarAudio();

    if (itens.length === 0) {
      toast.error("Seu carrinho está vazio.");
      return;
    }
    if (
      tipoEntrega === "entrega" &&
      (!rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim())
    ) {
      toast.error("Informe rua, número, bairro e cidade.");
      return;
    }

    const troco = formaPagamento === "dinheiro" ? Number(trocoPara.replace(",", ".")) : null;
    if (formaPagamento === "dinheiro" && trocoPara.trim() && (!troco || troco < valorTotal)) {
      toast.error("O valor para troco deve ser maior ou igual ao total.");
      return;
    }

    const enderecoCompleto =
      tipoEntrega === "entrega"
        ? [
            `${rua.trim()}, ${numero.trim()}`,
            bairro.trim(),
            cidade.trim(),
            complemento.trim(),
          ]
            .filter(Boolean)
            .join(" - ")
        : null;

    setEnviando(true);
    const novoId = crypto.randomUUID();
    const { error } = await supabase
      .from("pedidos")
      .insert({
        id: novoId,
        cliente_nome: nome.trim(),
        cliente_telefone: telefone.trim(),
        tipo_entrega: tipoEntrega,
        endereco: enderecoCompleto,
        forma_pagamento: formaPagamento,
        troco_para: formaPagamento === "dinheiro" && troco ? troco : null,
        itens: itens.map(({ key: _key, imagem_url: _img, ...resto }) => resto),
        valor_total: valorTotal,
      });
    setEnviando(false);

    if (error) {
      toast.error("Não foi possível enviar o pedido. Tente novamente.");
      return;
    }

    limpar();
    navigate({ to: "/pedido/$id", params: { id: novoId } });
  }



  if (itens.length === 0) {
    return (
      <CabecalhoLoja>
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Não há itens no carrinho para finalizar.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Ver cardápio</Link>
          </Button>
        </div>
      </CabecalhoLoja>
    );
  }

  return (
    <CabecalhoLoja>
      <h1 className="mb-4 text-xl font-bold tracking-tight">Finalizar pedido</h1>

      <form onSubmit={confirmar} className="space-y-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Seus dados
          </h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                required
                inputMode="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Entrega
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {(["retirada", "entrega"] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => setTipoEntrega(op)}
                className={`rounded-xl border p-3 text-sm font-medium capitalize transition-colors ${
                  tipoEntrega === op
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card"
                }`}
              >
                {op === "retirada" ? "Retirada" : "Entrega"}
              </button>
            ))}
          </div>

          {tipoEntrega === "entrega" && (
            <div className="mt-3">
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, bairro, complemento"
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Resumo
          </h2>
          <ul className="space-y-2 text-sm">
            {itens.map((item) => (
              <li key={item.key} className="flex justify-between gap-3">
                <span>
                  {item.quantidade}× {item.nome}
                  {item.tamanho && ` (${TAMANHO_LABEL[item.tamanho as Tamanho]})`}
                </span>
                <span className="font-medium">
                  {moeda(item.preco_unitario * item.quantidade)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{moeda(valorTotal)}</span>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando ? "Enviando..." : "Confirmar pedido"}
        </Button>
      </form>
    </CabecalhoLoja>
  );
}
