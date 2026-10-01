-- PRD v1.1 foundation: one answer to "does this person have the Season Pass
-- right now?" that every gated feature (8 Spaces, invited Bonds, Bond Log,
-- Life Wrapped, keepsakes, group creation) asks, in SQL and in the app.
--
-- Access holds while a trial runs, while a plan is active or retrying a
-- payment, and after a cancel until the paid period ends.

create or replace function private.has_pass(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when s.status = 'trialing' then coalesce(s.trial_ends_at, s.current_period_end, now()) > now()
      when s.status in ('active', 'past_due') then true
      when s.status = 'canceled' then coalesce(s.current_period_end, '-infinity'::timestamptz) > now()
      else false
    end
    from public.subscriptions s
    where s.user_id = p_user_id
  ), false);
$$;

-- The signed-in member's own answer, for the app.
create or replace function public.has_pass()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_pass((select auth.uid()));
$$;

revoke execute on function public.has_pass() from public, anon;
grant execute on function public.has_pass() to authenticated;

revoke execute on function private.has_pass(uuid) from public, anon;
grant execute on function private.has_pass(uuid) to authenticated, service_role;
