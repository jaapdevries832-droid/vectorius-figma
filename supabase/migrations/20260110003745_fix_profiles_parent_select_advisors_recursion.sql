create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_role() from public;
grant execute on function public.current_role() to authenticated;

drop policy if exists profiles_parent_select_advisors on public.profiles;

create policy profiles_parent_select_advisors
on public.profiles for select
using (
  role = 'advisor'
  and public.current_role() = 'parent'
);
