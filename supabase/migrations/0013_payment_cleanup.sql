-- ---------------------------------------------------------------------
-- PAYMENT CLEANUP
-- ---------------------------------------------------------------------

-- clear_payment: remove payment details while keeping the member/month row
-- available for a future payment entry.
create or replace function clear_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment membership_payments%rowtype;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can clear payments';
  end if;

  select * into v_payment from membership_payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  delete from lounge_fund_transactions
  where source_table = 'membership_payments' and source_id = p_payment_id;
  delete from payment_allocations where payment_id = p_payment_id;

  update membership_payments
  set amount = 0,
      payment_date = null,
      payment_method = null,
      reference_number = null,
      status = 'unpaid',
      notes = null,
      recorded_by = null
  where id = p_payment_id;

  insert into audit_logs (actor_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'payment_cleared', 'membership_payments', p_payment_id,
          jsonb_build_object('member_id', v_payment.member_id, 'amount', v_payment.amount));
end;
$$;

-- delete_payment: permanently remove an incorrectly created payment and its
-- corresponding Lounge Fund income transaction.
create or replace function delete_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment membership_payments%rowtype;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can delete payments';
  end if;

  select * into v_payment from membership_payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  delete from lounge_fund_transactions
  where source_table = 'membership_payments' and source_id = p_payment_id;
  delete from membership_payments where id = p_payment_id;

  insert into audit_logs (actor_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'payment_deleted', 'membership_payments', p_payment_id,
          jsonb_build_object('member_id', v_payment.member_id, 'amount', v_payment.amount));
end;
$$;