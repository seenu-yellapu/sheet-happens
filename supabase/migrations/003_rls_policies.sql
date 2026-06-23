-- event_files: open access until auth is added
alter table event_files enable row level security;
create policy "allow_all_event_files" on event_files for all using (true) with check (true);

-- storage: allow all operations on the uploads bucket
create policy "allow_uploads_all" on storage.objects
  for all using (bucket_id = 'uploads') with check (bucket_id = 'uploads');
