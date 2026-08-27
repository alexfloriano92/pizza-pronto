create or replace function public.validar_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  qtd int;
  tam text;
  prod record;
  preco numeric;
  total numeric := 0;
  novos jsonb := '[]'::jsonb;
begin
  -- estado inicial sempre controlado pelo servidor
  new.status := 'recebido';
  new.arquivado := false;
  new.criado_em := now();
  new.atualizado_em := now();

  new.cliente_nome := btrim(coalesce(new.cliente_nome, ''));
  new.cliente_telefone := btrim(coalesce(new.cliente_telefone, ''));

  if length(new.cliente_nome) < 2 or length(new.cliente_nome) > 80 then
    raise exception 'Nome do cliente inválido';
  end if;
  if length(regexp_replace(new.cliente_telefone, '[^0-9]', '', 'g')) < 8
     or length(new.cliente_telefone) > 25 then
    raise exception 'Telefone inválido';
  end if;
  if new.tipo_entrega not in ('retirada', 'entrega') then
    raise exception 'Tipo de entrega inválido';
  end if;
  if new.tipo_entrega = 'entrega' then
    new.endereco := btrim(coalesce(new.endereco, ''));
    if length(new.endereco) < 5 or length(new.endereco) > 300 then
      raise exception 'Endereço inválido';
    end if;
  else
    new.endereco := null;
  end if;
  if new.forma_pagamento not in ('cartao', 'pix', 'dinheiro') then
    raise exception 'Forma de pagamento inválida';
  end if;
  if new.forma_pagamento <> 'dinheiro' then
    new.troco_para := null;
  elsif new.troco_para is not null and (new.troco_para < 0 or new.troco_para > 100000) then
    raise exception 'Valor de troco inválido';
  end if;

  if jsonb_typeof(new.itens) <> 'array'
     or jsonb_array_length(new.itens) = 0
     or jsonb_array_length(new.itens) > 50 then
    raise exception 'Itens do pedido inválidos';
  end if;

  for item in select * from jsonb_array_elements(new.itens)
  loop
    qtd := coalesce((item->>'quantidade')::int, 0);
    if qtd < 1 or qtd > 30 then
      raise exception 'Quantidade inválida';
    end if;
    if length(coalesce(item->>'observacoes', '')) > 200 then
      raise exception 'Observação muito longa';
    end if;

    select p.id, p.nome, p.tipo, p.disponivel, p.promocao, p.preco_promocional
      into prod
      from public.produtos p
     where p.id = (item->>'produto_id')::uuid;

    if not found or not prod.disponivel then
      raise exception 'Produto indisponível';
    end if;

    tam := nullif(item->>'tamanho', '');

    if prod.promocao and prod.preco_promocional is not null and prod.tipo = 'pizza' then
      tam := 'grande';
      preco := prod.preco_promocional;
    else
      select pr.preco into preco
        from public.precos_produto pr
       where pr.produto_id = prod.id
         and (pr.tamanho is not distinct from tam);
      if preco is null then
        raise exception 'Preço não encontrado para o item';
      end if;
    end if;

    total := total + preco * qtd;

    novos := novos || jsonb_build_object(
      'produto_id', prod.id,
      'nome', prod.nome,
      'tipo', prod.tipo,
      'tamanho', tam,
      'quantidade', qtd,
      'observacoes', left(coalesce(item->>'observacoes', ''), 200),
      'preco_unitario', preco
    );
  end loop;

  new.itens := novos;
  new.valor_total := round(total, 2);

  if new.forma_pagamento = 'dinheiro' and new.troco_para is not null
     and new.troco_para < new.valor_total then
    raise exception 'Troco menor que o total do pedido';
  end if;

  return new;
end;
$$;

revoke all on function public.validar_pedido() from public, anon, authenticated;

drop trigger if exists trg_pedidos_validar on public.pedidos;
create trigger trg_pedidos_validar
before insert on public.pedidos
for each row execute function public.validar_pedido();