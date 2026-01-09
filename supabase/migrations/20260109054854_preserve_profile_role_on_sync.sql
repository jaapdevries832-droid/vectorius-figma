-- Preserve existing profiles.role during auth sync updates

create or replace function public.sync_profiles()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into profiles (id, email, role, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
  set email = excluded.email,
      role = coalesce(profiles.role, excluded.role),
      name = coalesce(excluded.name, profiles.name);

  return new;
end;
$function$;
