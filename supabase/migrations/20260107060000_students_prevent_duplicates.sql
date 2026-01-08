update public.students
set last_name = null
where last_name = '';

with ranked as (
  select
    id,
    row_number() over (
      partition by
        parent_id,
        lower(first_name),
        lower(coalesce(last_name, '')),
        coalesce(grade, '')
      order by created_at desc, id desc
    ) as rn
  from public.students
)
delete from public.students using ranked
where public.students.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists students_unique_per_parent
on public.students (
  parent_id,
  lower(first_name),
  lower(coalesce(last_name, '')),
  coalesce(grade, '')
);
