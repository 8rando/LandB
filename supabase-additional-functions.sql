-- Additional functions for LanIMS Supabase integration
-- These functions extend the existing schema with service layer support

-- Function to update product stock (used by invoices service)
create or replace function update_product_stock(product_id uuid, quantity_change integer)
returns void as $$
begin
    update products
    set quantity = greatest(0, quantity + quantity_change),
        updated_at = now()
    where id = product_id
    and item_type = 'Inventory';
end;
$$ language plpgsql;

-- Function to get user role by user ID
create or replace function get_user_role(user_id uuid)
returns text as $$
declare
    user_role text;
begin
    select role into user_role
    from user_profiles
    where id = user_id;

    return coalesce(user_role, 'none');
end;
$$ language plpgsql;

-- Function to check if user is admin
-- security definer + a fixed search_path makes this bypass RLS, which is
-- required: the "Admins can insert/update/delete profiles" policy on
-- user_profiles calls this to check admin status. If this function were a
-- plain (non-definer) function, its internal SELECT against user_profiles
-- would re-trigger that same policy, causing "infinite recursion detected
-- in policy for relation user_profiles".
create or replace function is_user_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
    select exists (
        select 1 from user_profiles
        where id = user_id and role = 'admin'
    );
$$;

grant execute on function public.is_user_admin(uuid) to anon, authenticated;

-- Replace the self-referencing policy (its USING clause queried
-- user_profiles directly, causing infinite recursion) with one that uses
-- the security-definer helper above instead.
drop policy if exists "Admins can insert/update/delete profiles" on user_profiles;

create policy "Admins can insert/update/delete profiles" on user_profiles
    for all using (is_user_admin(auth.uid()));

-- Function to get product low stock count
create or replace function get_low_stock_count()
returns integer as $$
declare
    threshold integer;
    low_count integer;
begin
    -- Get current low stock threshold
    select low_stock_threshold into threshold from business_settings limit 1;

    -- Count products below threshold
    select count(*) into low_count
    from products
    where quantity < coalesce(threshold, 5)
    and item_type = 'Inventory'
    and is_active = true;

    return low_count;
end;
$$ language plpgsql;

-- Function to get sales statistics for dashboard
create or replace function get_sales_stats(start_date timestamptz default null, end_date timestamptz default null)
returns table(
    total_sales numeric,
    total_invoices bigint,
    avg_invoice_value numeric,
    paid_invoices bigint,
    unpaid_invoices bigint
) as $$
begin
    return query
    select
        coalesce(sum(case when i.paid then i.total else 0 end), 0) as total_sales,
        count(*) as total_invoices,
        coalesce(avg(i.total), 0) as avg_invoice_value,
        count(*) filter (where i.paid = true) as paid_invoices,
        count(*) filter (where i.paid = false) as unpaid_invoices
    from invoices i
    where (start_date is null or i.created_at >= start_date)
    and (end_date is null or i.created_at <= end_date);
end;
$$ language plpgsql;

-- Function to create user profile after signup (trigger function)
create or replace function handle_new_user_signup()
returns trigger as $$
begin
    -- This will be called by a trigger on auth.users
    -- But since we're handling user creation in the application layer,
    -- this is mainly for completeness
    return new;
end;
$$ language plpgsql;

-- Function to soft delete products (instead of hard delete)
create or replace function soft_delete_product(product_id uuid)
returns boolean as $$
begin
    update products
    set is_active = false,
        updated_at = now()
    where id = product_id;

    return found;
end;
$$ language plpgsql;

-- Function to restore soft deleted products
create or replace function restore_product(product_id uuid)
returns boolean as $$
begin
    update products
    set is_active = true,
        updated_at = now()
    where id = product_id;

    return found;
end;
$$ language plpgsql;

-- View for active products (commonly used query)
create or replace view active_products as
select *
from products
where is_active = true;

-- View for low stock products
create or replace view low_stock_products as
select p.*, bs.low_stock_threshold
from products p
cross join business_settings bs
where p.quantity < bs.low_stock_threshold
and p.item_type = 'Inventory'
and p.is_active = true;

-- View for recent activities with user information
create or replace view recent_activities as
select
    a.id,
    a.type,
    a.description,
    a.metadata,
    a.created_at,
    up.username,
    up.role as user_role
from activities a
left join user_profiles up on a.user_id = up.id
order by a.created_at desc;

-- Grant permissions for the views
grant select on active_products to authenticated;
grant select on low_stock_products to authenticated;
grant select on recent_activities to authenticated;

-- Health check function callable by anon (bypasses RLS for setup screen)
create or replace function public.get_app_health()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'user_count', (select count(*)::int from user_profiles),
    'product_count', (select count(*)::int from products),
    'invoice_count', (select count(*)::int from invoices)
  );
$$;

grant execute on function public.get_app_health() to anon, authenticated;

-- Username availability check callable by anon (RLS blocks anon SELECT on
-- user_profiles, which previously made every registration attempt fall
-- into the error path and report "Username already exists")
create or replace function public.is_username_available(p_username text, p_exclude_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from user_profiles
    where username = lower(trim(p_username))
    and (p_exclude_id is null or id <> p_exclude_id)
  );
$$;

grant execute on function public.is_username_available(text, uuid) to anon, authenticated;

-- A brand-new user must be able to insert their own profile row before any
-- admin row exists. The original "for all" admin policy made this
-- impossible (chicken-and-egg: you needed an admin row to create one).
-- (drop-then-create makes this script safe to re-run; without it, a
-- second run errors on "policy already exists" and the whole script's
-- transaction rolls back, silently undoing earlier fixes in this file too)
drop policy if exists "Users can insert own profile" on user_profiles;

create policy "Users can insert own profile" on user_profiles
    for insert with check (auth.uid() = id);

-- business_settings had select/update policies but no insert policy, so
-- getOrCreateBusinessSettings() would fail with an RLS violation for any
-- authenticated user (e.g. the first admin, right after registering) if no
-- settings row exists yet.
drop policy if exists "Authenticated users can insert settings" on business_settings;

create policy "Authenticated users can insert settings" on business_settings
    for insert with check (auth.role() = 'authenticated');