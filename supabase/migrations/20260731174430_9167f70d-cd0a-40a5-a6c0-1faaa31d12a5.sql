create type public.app_role as enum ('admin', 'equipe');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  criado_em timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "user_roles_select_own" on public.user_roles
for select to authenticated
using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- produtos: leitura pública, escrita apenas admin
drop policy if exists "produtos_public_all" on public.produtos;
create policy "produtos_select_public" on public.produtos
for select to anon, authenticated using (true);
create policy "produtos_admin_write" on public.produtos
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- precos: leitura pública, escrita apenas admin
drop policy if exists "precos_public_all" on public.precos_produto;
create policy "precos_select_public" on public.precos_produto
for select to anon, authenticated using (true);
create policy "precos_admin_write" on public.precos_produto
for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- pedidos: cliente cria/consulta, apenas admin atualiza
drop policy if exists "pedidos_public_update" on public.pedidos;
create policy "pedidos_admin_update" on public.pedidos
for update to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));