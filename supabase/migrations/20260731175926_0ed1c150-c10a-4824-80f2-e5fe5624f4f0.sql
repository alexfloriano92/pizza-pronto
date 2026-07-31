CREATE OR REPLACE FUNCTION public.pedido_por_codigo(_codigo text)
RETURNS TABLE(id uuid, cliente_nome text, tipo_entrega text, endereco text, itens jsonb, valor_total numeric, status text, criado_em timestamptz, atualizado_em timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.cliente_nome, p.tipo_entrega, p.endereco, p.itens,
         p.valor_total, p.status, p.criado_em, p.atualizado_em
  FROM public.pedidos p
  WHERE length(regexp_replace(coalesce(_codigo,''), '[^0-9a-fA-F]', '', 'g')) >= 8
    AND left(replace(p.id::text, '-', ''), 8) = lower(left(regexp_replace(_codigo, '[^0-9a-fA-F]', '', 'g'), 8))
  ORDER BY p.criado_em DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.pedido_por_codigo(text) TO anon, authenticated;