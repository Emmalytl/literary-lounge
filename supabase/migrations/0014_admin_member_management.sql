-- ---------------------------------------------------------------------
-- ADMIN MEMBER MANAGEMENT
-- ---------------------------------------------------------------------

alter table profiles
  add column if not exists welcome_email_sent_at timestamptz;

create or replace function admin_change_member_role(
  p_member_id uuid,
  p_role member_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can change member roles';
  end if;

  if p_member_id = auth.uid() then
    raise exception 'Admins cannot change their own role';
  end if;

  update profiles
  set role = p_role,
      updated_at = now()
  where id = p_member_id;

  if not found then
    raise exception 'Member not found';
  end if;

  insert into audit_logs (actor_id, action, entity_table, entity_id, metadata)
  values (auth.uid(), 'member_role_changed', 'profiles', p_member_id,
          jsonb_build_object('role', p_role::text));
end;
$$;
