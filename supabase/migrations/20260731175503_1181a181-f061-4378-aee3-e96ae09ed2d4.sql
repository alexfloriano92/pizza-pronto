-- 1. Pedidos: remover leitura pública (vazava nome/telefone/endereço de todos os clientes)
DROP POLICY IF EXISTS pedidos_public_select ON public.pedidos;

CREATE POLICY pedidos_admin_select ON public.pedidos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Inserção pública continua, mas sem poder forjar status
DROP POLICY IF EXISTS pedidos_public_insert ON public.pedidos;

CREATE POLICY pedidos_public_insert ON public.pedidos
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'recebido');

-- 3. Acompanhamento pelo cliente: consulta segura por id (uuid não adivinhável)
CREATE OR REPLACE FUNCTION public.pedido_publico(_id uuid)
RETURNS TABLE (
  id uuid,
  cliente_nome text,
  tipo_entrega text,
  endereco text,
  itens jsonb,
  valor_total numeric,
  status text,
  criado_em timestamptz,
  atualizado_em timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.cliente_nome, p.tipo_entrega, p.endereco, p.itens,
         p.valor_total, p.status, p.criado_em, p.atualizado_em
  FROM public.pedidos p
  WHERE p.id = _id
$$;

REVOKE ALL ON FUNCTION public.pedido_publico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pedido_publico(uuid) TO anon, authenticated;