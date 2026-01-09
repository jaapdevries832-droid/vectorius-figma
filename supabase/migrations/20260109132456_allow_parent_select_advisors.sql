-- Allow parents to read advisor profiles for assignment UI
drop policy if exists "profiles_parent_select_advisors" on public.profiles;
create policy "profiles_parent_select_advisors"
on public.profiles for select
using (
  role = 'advisor'
  and exists (
    select 1
    from public.profiles as parent_profile
    where parent_profile.id = auth.uid()
      and parent_profile.role = 'parent'
  )
);
