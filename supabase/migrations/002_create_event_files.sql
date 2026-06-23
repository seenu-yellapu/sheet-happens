create table if not exists event_files (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  storage_path text not null,
  size bigint not null,
  created_at timestamptz default now()
);

insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', false)
on conflict do nothing;
