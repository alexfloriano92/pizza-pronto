import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CabecalhoLoja } from "@/components/cabecalho-loja";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/acompanhar")({
  head: () => ({
    meta: [
      { title: "Consultar pedido pelo código — Pizza Frita" },
      {
        name: "description",
        content:
          "Digite o código gerado no fim do checkout para consultar o status do seu pedido de pizza frita.",
      },
      { property: "og:title", content: "Consultar pedido pelo código — Pizza Frita" },
      {
        property: "og:description",
        content: "Digite o código do seu pedido e acompanhe o preparo e a entrega.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConsultarPedido,
});

function ConsultarPedido() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    const limpo = codigo.replace(/[^0-9a-fA-F]/g, "");
    if (limpo.length < 8) {
      setErro("O código tem 8 caracteres. Confira e tente de novo.");
      return;
    }
    setErro(null);
    setBuscando(true);
    const { data, error } = await supabase.rpc("pedido_por_codigo", { _codigo: limpo });
    setBuscando(false);

    const encontrado = (data ?? [])[0];
    if (error || !encontrado) {
      setErro("Nenhum pedido encontrado com esse código.");
      return;
    }
    navigate({ to: "/pedido/$id", params: { id: encontrado.id } });
  }

  return (
    <CabecalhoLoja>
      <h1 className="text-xl font-bold tracking-tight">Acompanhar pedido</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Digite o código de 8 caracteres que apareceu ao finalizar o seu pedido.
      </p>

      <form
        onSubmit={consultar}
        className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <Label htmlFor="codigo">Código do pedido</Label>
        <Input
          id="codigo"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase().slice(0, 12))}
          placeholder="Ex.: A1B2C3D4"
          autoComplete="off"
          spellCheck={false}
          className="font-mono text-lg tracking-[0.3em] uppercase"
        />
        {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}

        <Button type="submit" size="lg" className="mt-4 w-full" disabled={buscando}>
          <Search className="size-4" />
          {buscando ? "Consultando..." : "Consultar status"}
        </Button>
      </form>
    </CabecalhoLoja>
  );
}
