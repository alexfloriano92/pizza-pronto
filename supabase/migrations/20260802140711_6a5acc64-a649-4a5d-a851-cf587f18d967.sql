ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS pedidos_arquivado_criado_em_idx ON public.pedidos (arquivado, criado_em DESC);

CREATE OR REPLACE FUNCTION public.arquivar_pedidos_antigos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  qtd integer;
BEGIN
  UPDATE public.pedidos
     SET arquivado = true
   WHERE arquivado = false
     AND status IN ('finalizado', 'cancelado')
     AND criado_em < now() - interval '12 hours';
  GET DIAGNOSTICS qtd = ROW_COUNT;
  RETURN qtd;
END;
$$;

REVOKE ALL ON FUNCTION public.arquivar_pedidos_antigos() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('arquivar-pedidos-diario')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'arquivar-pedidos-diario');

SELECT cron.schedule(
  'arquivar-pedidos-diario',
  '0 7 * * *',
  $$SELECT public.arquivar_pedidos_antigos();$$
);

SELECT public.arquivar_pedidos_antigos();