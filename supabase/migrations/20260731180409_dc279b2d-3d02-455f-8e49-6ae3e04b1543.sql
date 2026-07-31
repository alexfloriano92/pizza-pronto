CREATE OR REPLACE FUNCTION public.broadcast_status_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'id', NEW.id,
        'status', NEW.status,
        'atualizado_em', NEW.atualizado_em
      ),
      'status',
      'pedido-' || replace(NEW.id::text, '-', ''),
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pedidos_broadcast_status ON public.pedidos;
CREATE TRIGGER pedidos_broadcast_status
AFTER UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.broadcast_status_pedido();