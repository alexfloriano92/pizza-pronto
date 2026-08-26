ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS promocao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preco_promocional numeric(10,2);