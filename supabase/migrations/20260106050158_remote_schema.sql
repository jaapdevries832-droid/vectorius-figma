drop extension if exists "pg_net";

create type "public"."assignment_status" as enum ('todo', 'in_progress', 'done', 'blocked', 'archived');

create type "public"."parent_type" as enum ('mother', 'father', 'guardian', 'other');


  create table "public"."advisors" (
    "id" uuid not null default gen_random_uuid(),
    "first_name" text not null,
    "last_name" text not null,
    "email" text not null,
    "specialization" text,
    "bio" text,
    "capacity" smallint default 10,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."assignments" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid not null,
    "creator_advisor_id" uuid,
    "title" text not null,
    "description" text,
    "due_at" timestamp with time zone,
    "status" public.assignment_status not null default 'todo'::public.assignment_status,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "assignment_id" uuid not null,
    "author_profile_id" uuid not null,
    "body" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."comments" enable row level security;


  create table "public"."notes" (
    "id" uuid not null default gen_random_uuid(),
    "student_id" uuid not null,
    "author_advisor_id" uuid,
    "author_parent_id" uuid,
    "body" text not null,
    "visible_to_student" boolean not null default true,
    "visible_to_parents" boolean not null default true,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."parents" (
    "id" uuid not null default gen_random_uuid(),
    "first_name" text not null,
    "last_name" text not null,
    "email" text not null,
    "phone" text,
    "kind" public.parent_type not null default 'guardian'::public.parent_type,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."profiles" (
    "id" uuid not null,
    "role" text not null,
    "name" text,
    "email" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."student_advisor" (
    "student_id" uuid not null,
    "advisor_id" uuid not null,
    "is_primary" boolean not null default false,
    "start_date" date default CURRENT_DATE,
    "end_date" date
      );



  create table "public"."student_parent" (
    "student_id" uuid not null,
    "parent_id" uuid not null,
    "relation" public.parent_type,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."students" (
    "id" uuid not null default gen_random_uuid(),
    "first_name" text not null,
    "last_name" text not null,
    "email" text not null,
    "grade_level" smallint,
    "school_name" text,
    "status" text default 'active'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


CREATE UNIQUE INDEX advisors_email_key ON public.advisors USING btree (email);

CREATE UNIQUE INDEX advisors_pkey ON public.advisors USING btree (id);

CREATE UNIQUE INDEX assignments_pkey ON public.assignments USING btree (id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE INDEX idx_assignments_due ON public.assignments USING btree (due_at);

CREATE INDEX idx_assignments_status ON public.assignments USING btree (status);

CREATE INDEX idx_assignments_student ON public.assignments USING btree (student_id);

CREATE UNIQUE INDEX notes_pkey ON public.notes USING btree (id);

CREATE UNIQUE INDEX parents_email_key ON public.parents USING btree (email);

CREATE UNIQUE INDEX parents_pkey ON public.parents USING btree (id);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX student_advisor_pkey ON public.student_advisor USING btree (student_id, advisor_id);

CREATE UNIQUE INDEX student_parent_pkey ON public.student_parent USING btree (student_id, parent_id);

CREATE UNIQUE INDEX students_email_key ON public.students USING btree (email);

CREATE UNIQUE INDEX students_pkey ON public.students USING btree (id);

alter table "public"."advisors" add constraint "advisors_pkey" PRIMARY KEY using index "advisors_pkey";

alter table "public"."assignments" add constraint "assignments_pkey" PRIMARY KEY using index "assignments_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."notes" add constraint "notes_pkey" PRIMARY KEY using index "notes_pkey";

alter table "public"."parents" add constraint "parents_pkey" PRIMARY KEY using index "parents_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."student_advisor" add constraint "student_advisor_pkey" PRIMARY KEY using index "student_advisor_pkey";

alter table "public"."student_parent" add constraint "student_parent_pkey" PRIMARY KEY using index "student_parent_pkey";

alter table "public"."students" add constraint "students_pkey" PRIMARY KEY using index "students_pkey";

alter table "public"."advisors" add constraint "advisors_email_key" UNIQUE using index "advisors_email_key";

alter table "public"."assignments" add constraint "assignments_creator_advisor_id_fkey" FOREIGN KEY (creator_advisor_id) REFERENCES public.advisors(id) ON DELETE SET NULL not valid;

alter table "public"."assignments" validate constraint "assignments_creator_advisor_id_fkey";

alter table "public"."assignments" add constraint "assignments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE not valid;

alter table "public"."assignments" validate constraint "assignments_student_id_fkey";

alter table "public"."comments" add constraint "comments_author_profile_id_fkey" FOREIGN KEY (author_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_author_profile_id_fkey";

alter table "public"."notes" add constraint "notes_author_advisor_id_fkey" FOREIGN KEY (author_advisor_id) REFERENCES public.advisors(id) ON DELETE SET NULL not valid;

alter table "public"."notes" validate constraint "notes_author_advisor_id_fkey";

alter table "public"."notes" add constraint "notes_author_parent_id_fkey" FOREIGN KEY (author_parent_id) REFERENCES public.parents(id) ON DELETE SET NULL not valid;

alter table "public"."notes" validate constraint "notes_author_parent_id_fkey";

alter table "public"."notes" add constraint "notes_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE not valid;

alter table "public"."notes" validate constraint "notes_student_id_fkey";

alter table "public"."parents" add constraint "parents_email_key" UNIQUE using index "parents_email_key";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['mentor'::text, 'student'::text, 'parent'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."student_advisor" add constraint "student_advisor_advisor_id_fkey" FOREIGN KEY (advisor_id) REFERENCES public.advisors(id) ON DELETE CASCADE not valid;

alter table "public"."student_advisor" validate constraint "student_advisor_advisor_id_fkey";

alter table "public"."student_advisor" add constraint "student_advisor_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE not valid;

alter table "public"."student_advisor" validate constraint "student_advisor_student_id_fkey";

alter table "public"."student_parent" add constraint "student_parent_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE not valid;

alter table "public"."student_parent" validate constraint "student_parent_parent_id_fkey";

alter table "public"."student_parent" add constraint "student_parent_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE not valid;

alter table "public"."student_parent" validate constraint "student_parent_student_id_fkey";

alter table "public"."students" add constraint "students_email_check" CHECK ((POSITION(('@'::text) IN (email)) > 1)) not valid;

alter table "public"."students" validate constraint "students_email_check";

alter table "public"."students" add constraint "students_email_key" UNIQUE using index "students_email_key";

alter table "public"."students" add constraint "students_grade_level_check" CHECK (((grade_level >= 1) AND (grade_level <= 12))) not valid;

alter table "public"."students" validate constraint "students_grade_level_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.auth_uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(nullif(current_setting('request.jwt.claims', true)::json->>'sub',''), '')::uuid
$function$
;

CREATE OR REPLACE FUNCTION public.delete_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from profiles where id = old.id;
  return old;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  on conflict (id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      role = coalesce(excluded.role, profiles.role),
      name = coalesce(excluded.name, profiles.name);

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

grant delete on table "public"."advisors" to "anon";

grant insert on table "public"."advisors" to "anon";

grant references on table "public"."advisors" to "anon";

grant select on table "public"."advisors" to "anon";

grant trigger on table "public"."advisors" to "anon";

grant truncate on table "public"."advisors" to "anon";

grant update on table "public"."advisors" to "anon";

grant delete on table "public"."advisors" to "authenticated";

grant insert on table "public"."advisors" to "authenticated";

grant references on table "public"."advisors" to "authenticated";

grant select on table "public"."advisors" to "authenticated";

grant trigger on table "public"."advisors" to "authenticated";

grant truncate on table "public"."advisors" to "authenticated";

grant update on table "public"."advisors" to "authenticated";

grant delete on table "public"."advisors" to "service_role";

grant insert on table "public"."advisors" to "service_role";

grant references on table "public"."advisors" to "service_role";

grant select on table "public"."advisors" to "service_role";

grant trigger on table "public"."advisors" to "service_role";

grant truncate on table "public"."advisors" to "service_role";

grant update on table "public"."advisors" to "service_role";

grant delete on table "public"."assignments" to "anon";

grant insert on table "public"."assignments" to "anon";

grant references on table "public"."assignments" to "anon";

grant select on table "public"."assignments" to "anon";

grant trigger on table "public"."assignments" to "anon";

grant truncate on table "public"."assignments" to "anon";

grant update on table "public"."assignments" to "anon";

grant delete on table "public"."assignments" to "authenticated";

grant insert on table "public"."assignments" to "authenticated";

grant references on table "public"."assignments" to "authenticated";

grant select on table "public"."assignments" to "authenticated";

grant trigger on table "public"."assignments" to "authenticated";

grant truncate on table "public"."assignments" to "authenticated";

grant update on table "public"."assignments" to "authenticated";

grant delete on table "public"."assignments" to "service_role";

grant insert on table "public"."assignments" to "service_role";

grant references on table "public"."assignments" to "service_role";

grant select on table "public"."assignments" to "service_role";

grant trigger on table "public"."assignments" to "service_role";

grant truncate on table "public"."assignments" to "service_role";

grant update on table "public"."assignments" to "service_role";

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";

grant insert on table "public"."comments" to "authenticated";

grant references on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";

grant delete on table "public"."notes" to "anon";

grant insert on table "public"."notes" to "anon";

grant references on table "public"."notes" to "anon";

grant select on table "public"."notes" to "anon";

grant trigger on table "public"."notes" to "anon";

grant truncate on table "public"."notes" to "anon";

grant update on table "public"."notes" to "anon";

grant delete on table "public"."notes" to "authenticated";

grant insert on table "public"."notes" to "authenticated";

grant references on table "public"."notes" to "authenticated";

grant select on table "public"."notes" to "authenticated";

grant trigger on table "public"."notes" to "authenticated";

grant truncate on table "public"."notes" to "authenticated";

grant update on table "public"."notes" to "authenticated";

grant delete on table "public"."notes" to "service_role";

grant insert on table "public"."notes" to "service_role";

grant references on table "public"."notes" to "service_role";

grant select on table "public"."notes" to "service_role";

grant trigger on table "public"."notes" to "service_role";

grant truncate on table "public"."notes" to "service_role";

grant update on table "public"."notes" to "service_role";

grant delete on table "public"."parents" to "anon";

grant insert on table "public"."parents" to "anon";

grant references on table "public"."parents" to "anon";

grant select on table "public"."parents" to "anon";

grant trigger on table "public"."parents" to "anon";

grant truncate on table "public"."parents" to "anon";

grant update on table "public"."parents" to "anon";

grant delete on table "public"."parents" to "authenticated";

grant insert on table "public"."parents" to "authenticated";

grant references on table "public"."parents" to "authenticated";

grant select on table "public"."parents" to "authenticated";

grant trigger on table "public"."parents" to "authenticated";

grant truncate on table "public"."parents" to "authenticated";

grant update on table "public"."parents" to "authenticated";

grant delete on table "public"."parents" to "service_role";

grant insert on table "public"."parents" to "service_role";

grant references on table "public"."parents" to "service_role";

grant select on table "public"."parents" to "service_role";

grant trigger on table "public"."parents" to "service_role";

grant truncate on table "public"."parents" to "service_role";

grant update on table "public"."parents" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."student_advisor" to "anon";

grant insert on table "public"."student_advisor" to "anon";

grant references on table "public"."student_advisor" to "anon";

grant select on table "public"."student_advisor" to "anon";

grant trigger on table "public"."student_advisor" to "anon";

grant truncate on table "public"."student_advisor" to "anon";

grant update on table "public"."student_advisor" to "anon";

grant delete on table "public"."student_advisor" to "authenticated";

grant insert on table "public"."student_advisor" to "authenticated";

grant references on table "public"."student_advisor" to "authenticated";

grant select on table "public"."student_advisor" to "authenticated";

grant trigger on table "public"."student_advisor" to "authenticated";

grant truncate on table "public"."student_advisor" to "authenticated";

grant update on table "public"."student_advisor" to "authenticated";

grant delete on table "public"."student_advisor" to "service_role";

grant insert on table "public"."student_advisor" to "service_role";

grant references on table "public"."student_advisor" to "service_role";

grant select on table "public"."student_advisor" to "service_role";

grant trigger on table "public"."student_advisor" to "service_role";

grant truncate on table "public"."student_advisor" to "service_role";

grant update on table "public"."student_advisor" to "service_role";

grant delete on table "public"."student_parent" to "anon";

grant insert on table "public"."student_parent" to "anon";

grant references on table "public"."student_parent" to "anon";

grant select on table "public"."student_parent" to "anon";

grant trigger on table "public"."student_parent" to "anon";

grant truncate on table "public"."student_parent" to "anon";

grant update on table "public"."student_parent" to "anon";

grant delete on table "public"."student_parent" to "authenticated";

grant insert on table "public"."student_parent" to "authenticated";

grant references on table "public"."student_parent" to "authenticated";

grant select on table "public"."student_parent" to "authenticated";

grant trigger on table "public"."student_parent" to "authenticated";

grant truncate on table "public"."student_parent" to "authenticated";

grant update on table "public"."student_parent" to "authenticated";

grant delete on table "public"."student_parent" to "service_role";

grant insert on table "public"."student_parent" to "service_role";

grant references on table "public"."student_parent" to "service_role";

grant select on table "public"."student_parent" to "service_role";

grant trigger on table "public"."student_parent" to "service_role";

grant truncate on table "public"."student_parent" to "service_role";

grant update on table "public"."student_parent" to "service_role";

grant delete on table "public"."students" to "anon";

grant insert on table "public"."students" to "anon";

grant references on table "public"."students" to "anon";

grant select on table "public"."students" to "anon";

grant trigger on table "public"."students" to "anon";

grant truncate on table "public"."students" to "anon";

grant update on table "public"."students" to "anon";

grant delete on table "public"."students" to "authenticated";

grant insert on table "public"."students" to "authenticated";

grant references on table "public"."students" to "authenticated";

grant select on table "public"."students" to "authenticated";

grant trigger on table "public"."students" to "authenticated";

grant truncate on table "public"."students" to "authenticated";

grant update on table "public"."students" to "authenticated";

grant delete on table "public"."students" to "service_role";

grant insert on table "public"."students" to "service_role";

grant references on table "public"."students" to "service_role";

grant select on table "public"."students" to "service_role";

grant trigger on table "public"."students" to "service_role";

grant truncate on table "public"."students" to "service_role";

grant update on table "public"."students" to "service_role";


  create policy "dev_read_all_comments"
  on "public"."comments"
  as permissive
  for select
  to public
using (true);



  create policy "profiles_insert_self"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((id = public.auth_uid()));



  create policy "profiles_insert_self_student"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check (((id = auth.uid()) AND (role = 'student'::text)));



  create policy "profiles_read_own"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((id = public.auth_uid()));



  create policy "profiles_update_own"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((id = public.auth_uid()));



  create policy "profiles_update_self_student"
  on "public"."profiles"
  as permissive
  for update
  to public
using (((id = auth.uid()) AND (role = 'student'::text)));


CREATE TRIGGER trg_advisors_touch BEFORE UPDATE ON public.advisors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_assignments_touch BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_parents_touch BEFORE UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_students_touch BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER on_auth_user_change AFTER INSERT OR UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.sync_profiles();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_delete AFTER DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.delete_profile();


