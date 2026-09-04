-- =========================================================================
-- FUNCTIONS & TRIGGERS
-- =========================================================================

-- Auto-create a profile row whenever a new auth.users row appears
-- (i.e. right after someone finishes registering).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New Member'),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- award_points: the ONLY way points_transactions gets member-driven rows.
-- Runs as SECURITY DEFINER so it can insert past RLS, but it enforces the
-- de-dup unique constraint on (member_id, activity_type, reference_table,
-- reference_id) so the same event can never be rewarded twice — this is
-- what stops "farming" a button by clicking it repeatedly.
-- ---------------------------------------------------------------------
create or replace function award_points(
  p_member_id uuid,
  p_activity_type text,
  p_points integer,
  p_reference_table text default null,
  p_reference_id uuid default null,
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into points_transactions
    (member_id, activity_type, points, reference_table, reference_id, description)
  values
    (p_member_id, p_activity_type, p_points, p_reference_table, p_reference_id, p_description)
  on conflict (member_id, activity_type, reference_table, reference_id) do nothing;

  update profiles
  set lounge_points = (
    select coalesce(sum(points), 0) from points_transactions where member_id = p_member_id
  ),
  updated_at = now()
  where id = p_member_id;
end;
$$;

-- ---------------------------------------------------------------------
-- record_payment: admin-only wrapper that inserts/updates a payment and
-- mirrors the income into the Lounge Fund ledger in one transaction,
-- so the fund balance can never drift out of sync with recorded payments.
-- ---------------------------------------------------------------------
create or replace function record_payment(
  p_member_id uuid,
  p_amount numeric,
  p_billing_month date,
  p_payment_method text,
  p_reference_number text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can record payments';
  end if;

  insert into membership_payments
    (member_id, amount, billing_month, payment_date, payment_method,
     reference_number, status, notes, recorded_by)
  values
    (p_member_id, p_amount, date_trunc('month', p_billing_month)::date, current_date,
     p_payment_method, p_reference_number, 'paid', p_notes, auth.uid())
  on conflict (member_id, billing_month) do update
    set amount = excluded.amount,
        payment_date = excluded.payment_date,
        payment_method = excluded.payment_method,
        reference_number = excluded.reference_number,
        status = 'paid',
        notes = excluded.notes,
        recorded_by = auth.uid()
  returning id into v_payment_id;

  update lounge_fund_transactions
  set amount = p_amount,
      description = 'Membership dues - ' || to_char(p_billing_month, 'Mon YYYY')
  where source_table = 'membership_payments' and source_id = v_payment_id;

  if not found then
    insert into lounge_fund_transactions (type, amount, source_table, source_id, description)
    values ('income', p_amount, 'membership_payments', v_payment_id,
            'Membership dues - ' || to_char(p_billing_month, 'Mon YYYY'));
  end if;

  insert into audit_logs (actor_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'payment_recorded', 'membership_payments', v_payment_id,
          jsonb_build_object('member_id', p_member_id, 'amount', p_amount));

  return v_payment_id;
end;
$$;

-- clear_payment: remove the payment details while keeping the member/month
-- row available for a future payment entry.
-- ---------------------------------------------------------------------
-- record_expense: admin-only, also books the Lounge Fund debit.
-- ---------------------------------------------------------------------
create or replace function record_expense(
  p_category text,
  p_description text,
  p_amount numeric,
  p_expense_date date,
  p_event_id uuid,
  p_vendor text,
  p_payment_method text,
  p_receipt_reference text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense_id uuid;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can record expenses';
  end if;

  insert into expenses
    (category, description, amount, expense_date, event_id, vendor,
     payment_method, receipt_reference, recorded_by, notes)
  values
    (p_category, p_description, p_amount, p_expense_date, p_event_id, p_vendor,
     p_payment_method, p_receipt_reference, auth.uid(), p_notes)
  returning id into v_expense_id;

  insert into lounge_fund_transactions (type, amount, source_table, source_id, description)
  values ('expense', p_amount, 'expenses', v_expense_id, p_description);

  insert into audit_logs (actor_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'expense_recorded', 'expenses', v_expense_id,
          jsonb_build_object('category', p_category, 'amount', p_amount));

  return v_expense_id;
end;
$$;

-- ---------------------------------------------------------------------
-- fund_balance: quick read for the finance dashboard
-- ---------------------------------------------------------------------
create or replace function fund_balance()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(case when type = 'income' then amount else -amount end), 0)
  from lounge_fund_transactions;
$$;
