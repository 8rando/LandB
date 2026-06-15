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
create or replace function is_user_admin(user_id uuid)
returns boolean as $$
begin
    return exists (
        select 1 from user_profiles
        where id = user_id and role = 'admin'
    );
end;
$$ language plpgsql;

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