-- Trigger / internal functions must not be callable through the API
REVOKE ALL ON FUNCTION public.broadcast_status_pedido() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_atualizado_em() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Role check: only signed-in users need it
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Intentionally public order lookups (no phone/contact exposed)
REVOKE ALL ON FUNCTION public.pedido_publico(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pedido_publico(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.pedido_por_codigo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pedido_por_codigo(text) TO anon, authenticated;