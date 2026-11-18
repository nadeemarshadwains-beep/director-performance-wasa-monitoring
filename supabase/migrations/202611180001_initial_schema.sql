create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'director');
create type public.report_status as enum ('draft', 'submitted', 'returned', 'approved');
create type public.target_period as enum ('monthly', 'annual');
create type public.target_metric as enum (
  'revenue_collection',
  'arrears_recovery',
  'field_visits',
  'surveys',
  'water_connections',
  'sewer_connections'
);

create table public.directors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null,
  director_id uuid unique references public.directors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_director_check check (
    (role = 'director' and director_id is not null)
    or (role = 'admin' and director_id is null)
  )
);

create table public.wasas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.director_wasa_assignments (
  id uuid primary key default gen_random_uuid(),
  director_id uuid not null references public.directors(id) on delete restrict,
  wasa_id uuid not null references public.wasas(id) on delete restrict,
  valid_from date not null default current_date,
  valid_to date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint assignment_dates_check check (valid_to is null or valid_to >= valid_from)
);

create unique index director_wasa_one_open_assignment
  on public.director_wasa_assignments (wasa_id)
  where valid_to is null;
create index director_wasa_director_idx
  on public.director_wasa_assignments (director_id, valid_from, valid_to);

create table public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  wasa_id uuid not null references public.wasas(id) on delete restrict,
  director_id uuid not null references public.directors(id) on delete restrict,
  report_year smallint not null check (report_year between 2000 and 2200),
  report_month smallint not null check (report_month between 1 and 12),
  status public.report_status not null default 'draft',
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_comment text,

  monthly_demand numeric(16, 2) not null default 0 check (monthly_demand >= 0),
  monthly_collection numeric(16, 2) not null default 0 check (monthly_collection >= 0),
  outstanding_current_demand numeric(16, 2)
    generated always as (monthly_demand - monthly_collection) stored,
  recovery_percentage numeric(7, 2)
    generated always as (
      case when monthly_demand = 0 then null
      else round(monthly_collection * 100 / monthly_demand, 2) end
    ) stored,

  opening_arrears numeric(16, 2) not null default 0 check (opening_arrears >= 0),
  additional_arrears numeric(16, 2) not null default 0 check (additional_arrears >= 0),
  arrears_recovered numeric(16, 2) not null default 0 check (arrears_recovered >= 0),
  approved_adjustments numeric(16, 2) not null default 0 check (approved_adjustments >= 0),
  closing_arrears numeric(16, 2)
    generated always as (
      opening_arrears + additional_arrears - arrears_recovered - approved_adjustments
    ) stored,

  opening_surveys integer not null default 0 check (opening_surveys >= 0),
  new_surveys integer not null default 0 check (new_surveys >= 0),
  corrected_surveys integer not null default 0 check (corrected_surveys >= 0),
  removed_surveys integer not null default 0 check (removed_surveys >= 0),
  closing_surveys integer
    generated always as (opening_surveys + new_surveys - removed_surveys) stored,

  opening_water_connections integer not null default 0 check (opening_water_connections >= 0),
  new_water_connections integer not null default 0 check (new_water_connections >= 0),
  removed_water_connections integer not null default 0 check (removed_water_connections >= 0),
  closing_water_connections integer
    generated always as (
      opening_water_connections + new_water_connections - removed_water_connections
    ) stored,
  water_connections_net_change integer
    generated always as (new_water_connections - removed_water_connections) stored,

  opening_sewer_connections integer not null default 0 check (opening_sewer_connections >= 0),
  new_sewer_connections integer not null default 0 check (new_sewer_connections >= 0),
  removed_sewer_connections integer not null default 0 check (removed_sewer_connections >= 0),
  closing_sewer_connections integer
    generated always as (
      opening_sewer_connections + new_sewer_connections - removed_sewer_connections
    ) stored,
  sewer_connections_net_change integer
    generated always as (new_sewer_connections - removed_sewer_connections) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_report_unique_period unique (wasa_id, report_year, report_month),
  constraint report_balances_nonnegative check (
    closing_arrears >= 0 and closing_surveys >= 0
    and closing_water_connections >= 0 and closing_sewer_connections >= 0
  )
);
create index monthly_reports_period_idx
  on public.monthly_reports (report_year desc, report_month desc);
create index monthly_reports_director_idx
  on public.monthly_reports (director_id, report_year desc, report_month desc);
create index monthly_reports_status_idx
  on public.monthly_reports (status, report_year, report_month);

create table public.field_visits (
  id uuid primary key default gen_random_uuid(),
  director_id uuid not null references public.directors(id) on delete restrict,
  wasa_id uuid not null references public.wasas(id) on delete restrict,
  visit_date date not null,
  location text not null,
  purpose text not null,
  activities_performed text not null,
  issues_identified text,
  instructions_given text,
  progress_achieved text,
  pending_actions text,
  responsible_officer text,
  expected_completion_date date,
  remarks text,
  attachment_path text,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_completion_after_visit check (
    expected_completion_date is null or expected_completion_date >= visit_date
  )
);
create index field_visits_director_date_idx
  on public.field_visits (director_id, visit_date desc);
create index field_visits_wasa_date_idx
  on public.field_visits (wasa_id, visit_date desc);

create table public.performance_targets (
  id uuid primary key default gen_random_uuid(),
  metric public.target_metric not null,
  period_type public.target_period not null,
  period_year smallint not null check (period_year between 2000 and 2200),
  period_month smallint check (period_month between 1 and 12),
  director_id uuid references public.directors(id) on delete cascade,
  wasa_id uuid references public.wasas(id) on delete cascade,
  target_value numeric(16, 2) not null check (target_value >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint target_exactly_one_scope check (
    (director_id is not null and wasa_id is null)
    or (director_id is null and wasa_id is not null)
  ),
  constraint target_period_month_check check (
    (period_type = 'monthly' and period_month is not null)
    or (period_type = 'annual' and period_month is null)
  )
);
create unique index target_unique_director_period on public.performance_targets
  (metric, period_type, period_year, coalesce(period_month, 0), director_id)
  where director_id is not null;
create unique index target_unique_wasa_period on public.performance_targets
  (metric, period_type, period_year, coalesce(period_month, 0), wasa_id)
  where wasa_id is not null;

create table public.report_approvals (
  id uuid primary key default gen_random_uuid(),
  monthly_report_id uuid not null references public.monthly_reports(id) on delete cascade,
  action text not null check (action in ('submitted', 'approved', 'returned', 'reopened')),
  comment text,
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index report_approvals_report_idx
  on public.report_approvals (monthly_report_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid references auth.users(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.current_director_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.director_id
  from public.profiles p
  join public.directors d on d.id = p.director_id and d.is_active
  where p.id = auth.uid() and p.role = 'director';
$$;

create or replace function public.is_assigned_to_current_user(target_wasa_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.director_wasa_assignments a
    join public.profiles p on p.director_id = a.director_id
    join public.directors d on d.id = p.director_id and d.is_active
    join public.wasas w on w.id = a.wasa_id and w.is_active
    where p.id = auth.uid()
      and p.role = 'director'
      and a.wasa_id = target_wasa_id
      and a.valid_from <= current_date
      and (a.valid_to is null or a.valid_to >= current_date)
  );
$$;

create or replace function public.write_audit_log()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(table_name, record_id, action, actor_id, new_data)
    values (tg_table_name, new.id::text, tg_op, auth.uid(), to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs(table_name, record_id, action, actor_id, old_data, new_data)
    values (tg_table_name, new.id::text, tg_op, auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_logs(table_name, record_id, action, actor_id, old_data)
    values (tg_table_name, old.id::text, tg_op, auth.uid(), to_jsonb(old));
    return old;
  end if;
end;
$$;

create or replace function public.record_report_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  event_action text;
begin
  if new.status is distinct from old.status then
    event_action := case
      when new.status = 'submitted' then 'submitted'
      when new.status = 'approved' then 'approved'
      when new.status = 'returned' and old.status = 'approved' then 'reopened'
      when new.status = 'returned' then 'returned'
      else null
    end;
    if event_action is not null then
      insert into public.report_approvals(monthly_report_id, action, comment, actor_id)
      values (new.id, event_action, new.review_comment, auth.uid());
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.record_initial_report_submission()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'submitted' then
    insert into public.report_approvals(monthly_report_id, action, actor_id)
    values (new.id, 'submitted', auth.uid());
  end if;
  return new;
end;
$$;

create or replace function public.guard_monthly_report_write()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.director_id is distinct from public.current_director_id()
       or not public.is_assigned_to_current_user(new.wasa_id)
       or new.submitted_by is distinct from auth.uid()
       or new.reviewed_by is not null or new.reviewed_at is not null
       or new.review_comment is not null then
      raise exception 'You may only submit reports for your assigned WASAs.';
    end if;
    if new.status = 'submitted' then
      new.submitted_at := now();
    else
      new.submitted_at := null;
    end if;
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  if old.status not in ('draft', 'returned')
     or old.director_id is distinct from new.director_id
     or old.wasa_id is distinct from new.wasa_id
     or old.report_year is distinct from new.report_year
     or old.report_month is distinct from new.report_month
     or old.id is distinct from new.id
     or old.created_at is distinct from new.created_at
     or old.submitted_at is distinct from new.submitted_at
     or old.submitted_by is distinct from new.submitted_by
     or old.reviewed_by is distinct from new.reviewed_by
     or old.reviewed_at is distinct from new.reviewed_at
     or old.review_comment is distinct from new.review_comment
     or new.director_id is distinct from public.current_director_id()
     or not public.is_assigned_to_current_user(new.wasa_id) then
    raise exception 'This report is locked or contains protected fields.';
  end if;
  if new.status not in ('draft', 'returned', 'submitted') then
    raise exception 'Invalid report status transition.';
  end if;
  if new.status = 'submitted' and old.status <> 'submitted' then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.admin_assign_wasa(
  target_director_id uuid,
  target_wasa_id uuid,
  assignment_date date default current_date
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required.';
  end if;
  if not exists (select 1 from public.directors where id = target_director_id and is_active)
     or not exists (select 1 from public.wasas where id = target_wasa_id and is_active) then
    raise exception 'Select an active Director and WASA.';
  end if;
  if assignment_date < current_date then
    raise exception 'New assignments must start today or on a future date.';
  end if;

  delete from public.director_wasa_assignments
  where wasa_id = target_wasa_id
    and valid_to is null
    and valid_from >= assignment_date;
  update public.director_wasa_assignments
  set valid_to = assignment_date - 1
  where wasa_id = target_wasa_id
    and valid_to is null
    and valid_from < assignment_date;

  insert into public.director_wasa_assignments (director_id, wasa_id, valid_from, created_by)
  values (target_director_id, target_wasa_id, assignment_date, auth.uid());
end;
$$;

create or replace function public.admin_update_director(
  target_director_id uuid,
  new_full_name text,
  active boolean
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required.';
  end if;
  if length(trim(new_full_name)) < 2 then
    raise exception 'Enter a valid Director name.';
  end if;

  update public.directors
  set full_name = trim(new_full_name), is_active = active
  where id = target_director_id;

  update public.profiles
  set full_name = trim(new_full_name)
  where director_id = target_director_id;
end;
$$;

create trigger directors_updated_at before update on public.directors
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger wasas_updated_at before update on public.wasas
  for each row execute function public.set_updated_at();
create trigger monthly_reports_updated_at before update on public.monthly_reports
  for each row execute function public.set_updated_at();
create trigger field_visits_updated_at before update on public.field_visits
  for each row execute function public.set_updated_at();
create trigger performance_targets_updated_at before update on public.performance_targets
  for each row execute function public.set_updated_at();

create trigger monthly_report_status_audit after update on public.monthly_reports
  for each row execute function public.record_report_status_change();
create trigger monthly_report_initial_submission after insert on public.monthly_reports
  for each row execute function public.record_initial_report_submission();
create trigger monthly_report_write_guard before insert or update on public.monthly_reports
  for each row execute function public.guard_monthly_report_write();

create trigger audit_directors after insert or update or delete on public.directors
  for each row execute function public.write_audit_log();
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.write_audit_log();
create trigger audit_wasas after insert or update or delete on public.wasas
  for each row execute function public.write_audit_log();
create trigger audit_assignments after insert or update or delete on public.director_wasa_assignments
  for each row execute function public.write_audit_log();
create trigger audit_monthly_reports after insert or update or delete on public.monthly_reports
  for each row execute function public.write_audit_log();
create trigger audit_field_visits after insert or update or delete on public.field_visits
  for each row execute function public.write_audit_log();
create trigger audit_targets after insert or update or delete on public.performance_targets
  for each row execute function public.write_audit_log();

alter table public.profiles enable row level security;
alter table public.directors enable row level security;
alter table public.wasas enable row level security;
alter table public.director_wasa_assignments enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.field_visits enable row level security;
alter table public.performance_targets enable row level security;
alter table public.report_approvals enable row level security;
alter table public.audit_logs enable row level security;

create policy "Profiles readable by self or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Admins manage profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Directors visible to admin or self" on public.directors
  for select to authenticated
  using (public.is_admin() or id = public.current_director_id());
create policy "Admins manage directors" on public.directors
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "WASAs visible to admin or assigned director" on public.wasas
  for select to authenticated
  using (public.is_admin() or public.is_assigned_to_current_user(id));
create policy "Admins manage WASAs" on public.wasas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Assignments visible to admin or assigned director" on public.director_wasa_assignments
  for select to authenticated
  using (public.is_admin() or director_id = public.current_director_id());
create policy "Admins manage assignments" on public.director_wasa_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Reports visible to admin or assigned director" on public.monthly_reports
  for select to authenticated
  using (
    public.is_admin()
    or (director_id = public.current_director_id() and public.is_assigned_to_current_user(wasa_id))
  );
create policy "Directors create own reports" on public.monthly_reports
  for insert to authenticated
  with check (
    director_id = public.current_director_id()
    and public.is_assigned_to_current_user(wasa_id)
    and status in ('draft', 'submitted')
    and submitted_by = auth.uid()
  );
create policy "Directors edit unapproved own reports" on public.monthly_reports
  for update to authenticated
  using (
    director_id = public.current_director_id()
    and public.is_assigned_to_current_user(wasa_id)
    and status in ('draft', 'returned')
  )
  with check (
    director_id = public.current_director_id()
    and public.is_assigned_to_current_user(wasa_id)
    and status in ('draft', 'returned', 'submitted')
  );
create policy "Admins manage reports" on public.monthly_reports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Visits visible to admin or owner" on public.field_visits
  for select to authenticated
  using (public.is_admin() or director_id = public.current_director_id());
create policy "Directors submit visits for assigned WASAs" on public.field_visits
  for insert to authenticated
  with check (
    director_id = public.current_director_id()
    and public.is_assigned_to_current_user(wasa_id)
    and submitted_by = auth.uid()
  );
create policy "Directors edit own visits" on public.field_visits
  for update to authenticated
  using (director_id = public.current_director_id())
  with check (
    director_id = public.current_director_id()
    and public.is_assigned_to_current_user(wasa_id)
  );
create policy "Admins manage visits" on public.field_visits
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Targets visible to admin or beneficiary" on public.performance_targets
  for select to authenticated
  using (
    public.is_admin()
    or director_id = public.current_director_id()
    or (wasa_id is not null and public.is_assigned_to_current_user(wasa_id))
  );
create policy "Admins manage targets" on public.performance_targets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Approval history visible to admin or report owner"
  on public.report_approvals for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.monthly_reports r
      where r.id = monthly_report_id and r.director_id = public.current_director_id()
    )
  );
create policy "Admins record report decisions" on public.report_approvals
  for insert to authenticated with check (public.is_admin());

create policy "Audit logs visible only to admin" on public.audit_logs
  for select to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visit-evidence',
  'visit-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Visit evidence readable by owner or admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'visit-evidence'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
create policy "Visit evidence upload restricted to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'visit-evidence'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
create policy "Visit evidence deletion restricted to owner or admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'visit-evidence'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.directors, public.wasas,
  public.director_wasa_assignments, public.monthly_reports, public.field_visits,
  public.performance_targets, public.report_approvals, public.audit_logs,
  public.profiles to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_director_id() to authenticated;
grant execute on function public.is_assigned_to_current_user(uuid) to authenticated;
grant execute on function public.admin_assign_wasa(uuid, uuid, date) to authenticated;
grant execute on function public.admin_update_director(uuid, text, boolean) to authenticated;
