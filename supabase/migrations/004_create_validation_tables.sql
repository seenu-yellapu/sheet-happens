create table if not exists file_validations (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references event_files(id) on delete cascade,
  total_rows integer not null default 0,
  clean_count integer not null default 0,
  flagged_count integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists validation_rows (
  id uuid primary key default gen_random_uuid(),
  validation_id uuid not null references file_validations(id) on delete cascade,
  row_index integer not null,
  row_data jsonb not null default '{}',
  is_clean boolean not null default true,
  issues jsonb not null default '[]'
);

alter table file_validations enable row level security;
create policy "allow_all_file_validations" on file_validations for all using (true) with check (true);

alter table validation_rows enable row level security;
create policy "allow_all_validation_rows" on validation_rows for all using (true) with check (true);
