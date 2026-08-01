import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ConfigLoja = {
  id: string;
  aberta: boolean;
  mensagem: string;
};

export async function buscarConfigLoja(): Promise<ConfigLoja | null> {
  const { data, error } = await supabase
    .from("configuracao_loja")
    .select("id, aberta, mensagem")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    aberta: data.aberta as boolean,
    mensagem: (data.mensagem as string) ?? "",
  };
}

/** Estado da loja (aberta/fechada) com atualização em tempo real. */
export function useConfigLoja() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["config-loja"],
    queryFn: buscarConfigLoja,
    staleTime: 30_000,
  });

  React.useEffect(() => {
    const canal = supabase
      .channel("config-loja")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "configuracao_loja" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["config-loja"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [queryClient]);

  return query;
}

export const MENSAGEM_FECHADA_PADRAO =
  "Estamos fechados no momento. Volte em breve para fazer seu pedido!";
