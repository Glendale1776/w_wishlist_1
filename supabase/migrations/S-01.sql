-- S-01: Supabase schema and privacy-safe aggregates
-- Idempotent migration; safe to re-run.

begin;

create extension if not exists pgcrypto;

-- ---------- Types ----------
do $$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'wishlist_visibility' and n.nspname = 'public'
  ) then
    create type public.wishlist_visibility as enum ('private', 'invite_only', 'link_only', 'public');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'claim_state' and n.nspname = 'public'
  ) then
    create type public.claim_state as enum ('reserved', 'purchased', 'cancelled');
  end if;
end
$$;

-- ---------- Helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.current_share_token_hash()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.share_token_hash', true), '');
$$;

-- ---------- Core tables ----------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  locale text not null default 'en-US',
  currency text not null default 'USD',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_currency_iso3_chk check (char_length(currency) = 3)
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  occasion_name text not null default 'Occasion',
  occasion_date date,
  note text,
  visibility public.wishlist_visibility not null default 'link_only',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishlists_title_nonempty_chk check (char_length(trim(title)) > 0)
);

create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  token_hash text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  title text not null,
  source_url text,
  image_url text,
  price_cents bigint,
  currency text not null default 'USD',
  group_funded boolean not null default false,
  target_cents bigint,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_title_nonempty_chk check (char_length(trim(title)) > 0),
  constraint items_price_nonnegative_chk check (price_cents is null or price_cents >= 0),
  constraint items_currency_iso3_chk check (char_length(currency) = 3),
  constraint items_target_valid_chk check (target_cents is null or target_cents >= 100),
  constraint items_group_target_chk check ((group_funded is false) or (target_cents is not null))
);

create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  claimer_user_id uuid not null references public.profiles(user_id) on delete cascade,
  state public.claim_state not null default 'reserved',
  quantity integer not null default 1,
  expires_at timestamptz not null default (now() + interval '72 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint claims_quantity_positive_chk check (quantity > 0)
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete restrict,
  contributor_user_id uuid not null references public.profiles(user_id) on delete cascade,
  amount_cents bigint not null,
  created_at timestamptz not null default now(),
  constraint contributions_amount_min_chk check (amount_cents >= 100)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(user_id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  meta_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_nonempty_chk check (char_length(trim(action)) > 0),
  constraint audit_logs_target_type_nonempty_chk check (char_length(trim(target_type)) > 0)
);

create or replace function public.is_wishlist_owner(p_wishlist_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.wishlists w
    where w.id = p_wishlist_id
      and w.owner_id = auth.uid()
  );
$$;

create or replace function public.can_read_wishlist_via_share_link(p_wishlist_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.share_links sl
    where sl.wishlist_id = p_wishlist_id
      and sl.revoked_at is null
      and sl.token_hash = public.current_share_token_hash()
  );
$$;

-- ---------- Indexes ----------
create unique index if not exists share_links_token_hash_uq on public.share_links(token_hash);

create index if not exists wishlists_owner_id_idx on public.wishlists(owner_id);
create index if not exists share_links_wishlist_id_idx on public.share_links(wishlist_id);
create index if not exists items_wishlist_id_idx on public.items(wishlist_id);
create index if not exists claims_item_id_idx on public.claims(item_id);
create index if not exists claims_wishlist_id_idx on public.claims(wishlist_id);
create index if not exists claims_claimer_user_id_idx on public.claims(claimer_user_id);
create index if not exists claims_item_state_idx on public.claims(item_id, state);
create index if not exists contributions_item_id_idx on public.contributions(item_id);
create index if not exists contributions_wishlist_id_idx on public.contributions(wishlist_id);
create index if not exists contributions_contributor_user_id_idx on public.contributions(contributor_user_id);
create index if not exists audit_logs_target_idx on public.audit_logs(target_type, target_id);

-- ---------- Updated-at triggers ----------
drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_wishlists_set_updated_at on public.wishlists;
create trigger trg_wishlists_set_updated_at
before update on public.wishlists
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_share_links_set_updated_at on public.share_links;
create trigger trg_share_links_set_updated_at
before update on public.share_links
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_items_set_updated_at on public.items;
create trigger trg_items_set_updated_at
before update on public.items
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_claims_set_updated_at on public.claims;
create trigger trg_claims_set_updated_at
before update on public.claims
for each row execute procedure public.set_updated_at();

-- ---------- Hard-delete guard ----------
create or replace function public.prevent_item_delete_with_history()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.claims c where c.item_id = old.id)
     or exists (select 1 from public.contributions k where k.item_id = old.id) then
    raise exception 'Item has claim or contribution history; archive instead.'
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_items_prevent_delete_with_history on public.items;
create trigger trg_items_prevent_delete_with_history
before delete on public.items
for each row execute procedure public.prevent_item_delete_with_history();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.wishlists enable row level security;
alter table public.share_links enable row level security;
alter table public.items enable row level security;
alter table public.claims enable row level security;
alter table public.contributions enable row level security;
alter table public.audit_logs enable row level security;

alter table public.profiles force row level security;
alter table public.wishlists force row level security;
alter table public.share_links force row level security;
alter table public.items force row level security;
alter table public.claims force row level security;
alter table public.contributions force row level security;
alter table public.audit_logs force row level security;

-- profiles
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists profiles_insert_self_or_admin on public.profiles;
create policy profiles_insert_self_or_admin
on public.profiles for insert
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin
on public.profiles for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

-- wishlists
drop policy if exists wishlists_select_owner_admin_or_share on public.wishlists;
create policy wishlists_select_owner_admin_or_share
on public.wishlists for select
using (
  public.is_wishlist_owner(id)
  or public.is_admin()
  or public.can_read_wishlist_via_share_link(id)
);

drop policy if exists wishlists_insert_owner_or_admin on public.wishlists;
create policy wishlists_insert_owner_or_admin
on public.wishlists for insert
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists wishlists_update_owner_or_admin on public.wishlists;
create policy wishlists_update_owner_or_admin
on public.wishlists for update
using (public.is_wishlist_owner(id) or public.is_admin())
with check (public.is_wishlist_owner(id) or public.is_admin());

drop policy if exists wishlists_delete_owner_or_admin on public.wishlists;
create policy wishlists_delete_owner_or_admin
on public.wishlists for delete
using (public.is_wishlist_owner(id) or public.is_admin());

-- share_links
drop policy if exists share_links_select_owner_admin_or_matching_token on public.share_links;
create policy share_links_select_owner_admin_or_matching_token
on public.share_links for select
using (
  public.is_admin()
  or public.is_wishlist_owner(wishlist_id)
  or (
    revoked_at is null
    and token_hash = public.current_share_token_hash()
  )
);

drop policy if exists share_links_mutate_owner_or_admin on public.share_links;
create policy share_links_mutate_owner_or_admin
on public.share_links for all
using (public.is_wishlist_owner(wishlist_id) or public.is_admin())
with check (public.is_wishlist_owner(wishlist_id) or public.is_admin());

-- items
drop policy if exists items_select_owner_admin_or_share on public.items;
create policy items_select_owner_admin_or_share
on public.items for select
using (
  public.is_admin()
  or public.is_wishlist_owner(wishlist_id)
  or public.can_read_wishlist_via_share_link(wishlist_id)
);

drop policy if exists items_mutate_owner_or_admin on public.items;
create policy items_mutate_owner_or_admin
on public.items for all
using (public.is_wishlist_owner(wishlist_id) or public.is_admin())
with check (public.is_wishlist_owner(wishlist_id) or public.is_admin());

-- claims
drop policy if exists claims_select_claimer_or_admin on public.claims;
create policy claims_select_claimer_or_admin
on public.claims for select
using (claimer_user_id = auth.uid() or public.is_admin());

drop policy if exists claims_insert_claimer_or_admin on public.claims;
create policy claims_insert_claimer_or_admin
on public.claims for insert
with check (claimer_user_id = auth.uid() or public.is_admin());

drop policy if exists claims_update_claimer_or_admin on public.claims;
create policy claims_update_claimer_or_admin
on public.claims for update
using (claimer_user_id = auth.uid() or public.is_admin())
with check (claimer_user_id = auth.uid() or public.is_admin());

drop policy if exists claims_delete_claimer_or_admin on public.claims;
create policy claims_delete_claimer_or_admin
on public.claims for delete
using (claimer_user_id = auth.uid() or public.is_admin());

-- contributions
drop policy if exists contributions_select_contributor_or_admin on public.contributions;
create policy contributions_select_contributor_or_admin
on public.contributions for select
using (contributor_user_id = auth.uid() or public.is_admin());

drop policy if exists contributions_insert_contributor_or_admin on public.contributions;
create policy contributions_insert_contributor_or_admin
on public.contributions for insert
with check (contributor_user_id = auth.uid() or public.is_admin());

drop policy if exists contributions_update_contributor_or_admin on public.contributions;
create policy contributions_update_contributor_or_admin
on public.contributions for update
using (contributor_user_id = auth.uid() or public.is_admin())
with check (contributor_user_id = auth.uid() or public.is_admin());

drop policy if exists contributions_delete_contributor_or_admin on public.contributions;
create policy contributions_delete_contributor_or_admin
on public.contributions for delete
using (contributor_user_id = auth.uid() or public.is_admin());

-- audit_logs
drop policy if exists audit_logs_select_owner_or_admin on public.audit_logs;
create policy audit_logs_select_owner_or_admin
on public.audit_logs for select
using (
  public.is_admin()
  or actor_user_id = auth.uid()
  or exists (
    select 1
    from public.wishlists w
    where w.owner_id = auth.uid()
      and (
        (target_type = 'wishlist' and target_id = w.id)
        or (target_type = 'item' and exists (
          select 1 from public.items i where i.id = target_id and i.wishlist_id = w.id
        ))
        or (target_type = 'claim' and exists (
          select 1 from public.claims c where c.id = target_id and c.wishlist_id = w.id
        ))
        or (target_type = 'contribution' and exists (
          select 1 from public.contributions k where k.id = target_id and k.wishlist_id = w.id
        ))
        or (target_type = 'share_link' and exists (
          select 1 from public.share_links sl where sl.id = target_id and sl.wishlist_id = w.id
        ))
      )
  )
);

drop policy if exists audit_logs_insert_authenticated_or_admin on public.audit_logs;
create policy audit_logs_insert_authenticated_or_admin
on public.audit_logs for insert
with check (auth.uid() is not null or public.is_admin());

-- ---------- Aggregate views ----------
create or replace view public.item_public_state_v
with (security_invoker = true)
as
with claim_totals as (
  select
    c.item_id,
    coalesce(sum(c.quantity) filter (where c.state = 'reserved'), 0)::bigint as reserved_qty,
    coalesce(sum(c.quantity) filter (where c.state = 'purchased'), 0)::bigint as purchased_qty
  from public.claims c
  group by c.item_id
),
contribution_totals as (
  select
    k.item_id,
    coalesce(sum(k.amount_cents), 0)::bigint as funded_cents
  from public.contributions k
  group by k.item_id
)
select
  i.id as item_id,
  i.wishlist_id,
  case
    when i.archived_at is not null then 'ARCHIVED'
    when coalesce(ct.purchased_qty, 0) > 0 then 'PURCHASED'
    when coalesce(ct.reserved_qty, 0) > 0 then 'RESERVED'
    else 'AVAILABLE'
  end as availability_state,
  coalesce(ct.reserved_qty, 0) as reserved_qty,
  coalesce(ct.purchased_qty, 0) as purchased_qty,
  coalesce(kc.funded_cents, 0) as funded_cents,
  coalesce(i.target_cents, i.price_cents, 0)::bigint as target_cents
from public.items i
left join claim_totals ct on ct.item_id = i.id
left join contribution_totals kc on kc.item_id = i.id;

create or replace view public.item_owner_state_v
with (security_invoker = true)
as
select
  ips.item_id,
  ips.wishlist_id,
  ips.availability_state,
  ips.reserved_qty,
  ips.purchased_qty,
  ips.funded_cents,
  ips.target_cents
from public.item_public_state_v ips;

create or replace view public.item_contributor_history_v
with (security_invoker = true)
as
select
  k.id as contribution_id,
  k.item_id,
  i.wishlist_id,
  k.contributor_user_id,
  k.amount_cents,
  k.created_at,
  (i.archived_at is not null) as is_item_archived
from public.contributions k
join public.items i on i.id = k.item_id;

-- ---------- Realtime publication ----------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'claims'
    ) then
      execute 'alter publication supabase_realtime add table public.claims';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'contributions'
    ) then
      execute 'alter publication supabase_realtime add table public.contributions';
    end if;
  end if;
end
$$;

-- ---------- Fixture seed helper for integration tests ----------
create or replace function public.seed_s01_fixtures(
  p_owner_user_id uuid,
  p_gifter_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wishlist_id uuid := '11111111-1111-1111-1111-111111111101';
  v_item_id uuid := '22222222-2222-2222-2222-222222222201';
  v_share_link_id uuid := '33333333-3333-3333-3333-333333333301';
  v_claim_id uuid := '44444444-4444-4444-4444-444444444401';
  v_contribution_id uuid := '55555555-5555-5555-5555-555555555501';
begin
  insert into public.profiles (user_id, display_name)
  values (p_owner_user_id, 'Fixture Owner')
  on conflict (user_id) do nothing;

  insert into public.profiles (user_id, display_name)
  values (p_gifter_user_id, 'Fixture Gifter')
  on conflict (user_id) do nothing;

  insert into public.wishlists (id, owner_id, title, occasion_name, visibility)
  values (v_wishlist_id, p_owner_user_id, 'Fixture Wishlist', 'Birthday', 'link_only')
  on conflict (id) do nothing;

  insert into public.share_links (id, wishlist_id, token_hash)
  values (v_share_link_id, v_wishlist_id, 'fixture_token_hash_s01')
  on conflict (id) do nothing;

  insert into public.items (id, wishlist_id, title, price_cents, group_funded, target_cents)
  values (v_item_id, v_wishlist_id, 'Fixture Item', 5000, true, 5000)
  on conflict (id) do nothing;

  insert into public.claims (id, wishlist_id, item_id, claimer_user_id, state, quantity)
  values (v_claim_id, v_wishlist_id, v_item_id, p_gifter_user_id, 'reserved', 1)
  on conflict (id) do nothing;

  insert into public.contributions (id, wishlist_id, item_id, contributor_user_id, amount_cents)
  values (v_contribution_id, v_wishlist_id, v_item_id, p_gifter_user_id, 1000)
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.seed_s01_fixtures(uuid, uuid) to authenticated;
grant execute on function public.seed_s01_fixtures(uuid, uuid) to service_role;

commit;
