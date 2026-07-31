CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('pizza','bebida')),
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  imagem_url text,
  disponivel boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO anon, authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "produtos_public_all" ON public.produtos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.precos_produto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tamanho text CHECK (tamanho IN ('pequena','media','grande')),
  preco numeric(10,2) NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.precos_produto TO anon, authenticated;
GRANT ALL ON public.precos_produto TO service_role;
ALTER TABLE public.precos_produto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "precos_public_all" ON public.precos_produto FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome text NOT NULL,
  cliente_telefone text NOT NULL,
  tipo_entrega text NOT NULL CHECK (tipo_entrega IN ('retirada','entrega')),
  endereco text,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  valor_total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'recebido' CHECK (status IN ('recebido','em_preparo','saiu_para_entrega','finalizado')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pedidos TO anon, authenticated;
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_public_select" ON public.pedidos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pedidos_public_insert" ON public.pedidos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "pedidos_public_update" ON public.pedidos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_produtos_upd BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER trg_precos_upd BEFORE UPDATE ON public.precos_produto FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();
CREATE TRIGGER trg_pedidos_upd BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.produtos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.produtos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.precos_produto;

WITH novos AS (
  INSERT INTO public.produtos (tipo, nome, descricao, imagem_url) VALUES
    ('pizza','Calabresa','Calabresa fatiada, cebola, mussarela e orégano','https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80'),
    ('pizza','Mussarela','Mussarela, tomate e orégano','https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80'),
    ('pizza','Frango com Catupiry','Frango desfiado, catupiry e milho','https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80'),
    ('pizza','Bacon','Bacon crocante, mussarela e cebola caramelizada','https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=800&q=80'),
    ('pizza','Portuguesa','Presunto, ovo, cebola, azeitona e mussarela','https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=800&q=80'),
    ('pizza','Carne Seca com Catupiry','Carne seca desfiada, catupiry e cebola roxa','https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80'),
    ('pizza','Chocolate','Pizza doce com chocolate ao leite e granulado','https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=800&q=80'),
    ('bebida','Coca-Cola Lata','Refrigerante 350ml','https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&q=80'),
    ('bebida','Guaraná Lata','Refrigerante 350ml','https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=800&q=80'),
    ('bebida','Suco de Laranja','Suco natural 400ml','https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&q=80'),
    ('bebida','Água Mineral','Sem gás, 500ml','https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=800&q=80')
  RETURNING id, nome, tipo
)
INSERT INTO public.precos_produto (produto_id, tamanho, preco)
SELECT n.id, p.tamanho, p.preco
FROM novos n
JOIN (VALUES
  ('Calabresa','pequena',22),('Calabresa','media',32),('Calabresa','grande',42),
  ('Mussarela','pequena',20),('Mussarela','media',30),('Mussarela','grande',40),
  ('Frango com Catupiry','pequena',25),('Frango com Catupiry','media',35),('Frango com Catupiry','grande',45),
  ('Bacon','pequena',25),('Bacon','media',35),('Bacon','grande',45),
  ('Portuguesa','pequena',26),('Portuguesa','media',36),('Portuguesa','grande',46),
  ('Carne Seca com Catupiry','pequena',28),('Carne Seca com Catupiry','media',38),('Carne Seca com Catupiry','grande',48),
  ('Chocolate','pequena',20),('Chocolate','media',28),('Chocolate','grande',36)
) AS p(nome, tamanho, preco) ON p.nome = n.nome AND n.tipo = 'pizza';

INSERT INTO public.precos_produto (produto_id, tamanho, preco)
SELECT id, NULL, CASE nome
  WHEN 'Coca-Cola Lata' THEN 6
  WHEN 'Guaraná Lata' THEN 6
  WHEN 'Suco de Laranja' THEN 8
  WHEN 'Água Mineral' THEN 4 END
FROM public.produtos WHERE tipo = 'bebida';