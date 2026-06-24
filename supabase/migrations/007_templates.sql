create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists template_field_rules (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references template_fields(id) on delete cascade,
  rule_type text not null,
  enabled boolean not null default false,
  value text,
  created_at timestamptz default now(),
  unique(field_id, rule_type),
  constraint template_field_rules_rule_type_check
    check (rule_type in ('type', 'required', 'valid_format', 'flag_duplicates', 'min_digits'))
);

alter table event_files
  add column if not exists template_id uuid references templates(id) on delete set null,
  add column if not exists column_mapping jsonb;

alter table templates enable row level security;
alter table template_fields enable row level security;
alter table template_field_rules enable row level security;

create policy "templates_user" on templates for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "template_fields_user" on template_fields for all
  using (template_id in (select id from templates where user_id = auth.uid()))
  with check (template_id in (select id from templates where user_id = auth.uid()));

create policy "template_field_rules_user" on template_field_rules for all
  using (field_id in (
    select tf.id from template_fields tf
    join templates t on tf.template_id = t.id
    where t.user_id = auth.uid()
  ))
  with check (field_id in (
    select tf.id from template_fields tf
    join templates t on tf.template_id = t.id
    where t.user_id = auth.uid()
  ));
