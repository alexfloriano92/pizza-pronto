CREATE TABLE public.configuracao_loja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aberta boolean NOT NULL DEFAULT true,
  mensagem text NOT NULL DEFAULT '',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.configuracao_loja TO anon;
GRANT SELECT, UPDATE ON public.configuracao_loja TO authenticated;
GRANT ALL ON public.configuracao_loja TO service_role;

ALTER TABLE public.configuracao_loja ENABLE ROW LEVEL SECURITY;

CREATE POLICY configuracao_select_public ON public.configuracao_loja
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY configuracao_admin_update ON public.configuracao_loja
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER configuracao_loja_atualizado_em
  BEFORE UPDATE ON public.configuracao_loja
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

INSERT INTO public.configuracao_loja (aberta, mensagem) VALUES (true, '');

ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracao_loja;

CREATE POLICY "produtos_imgs_leitura_publica" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'produtos');

CREATE POLICY "produtos_imgs_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'produtos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "produtos_imgs_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'produtos' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'produtos' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "produtos_imgs_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'produtos' AND public.has_role(auth.uid(), 'admin'::app_role));