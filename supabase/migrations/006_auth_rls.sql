-- Add user_id to events
alter table events
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Enable RLS on events and scope to the owning user
alter table events enable row level security;
create policy "events_user" on events for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Drop the existing open-access policies
drop policy if exists "allow_all_event_files" on event_files;
drop policy if exists "allow_all_file_validations" on file_validations;
drop policy if exists "allow_all_validation_rows" on validation_rows;
drop policy if exists "allow_uploads_all" on storage.objects;

-- event_files: accessible when the parent event belongs to the current user
create policy "event_files_user" on event_files for all
  using (exists (
    select 1 from events where id = event_files.event_id and user_id = auth.uid()
  ))
  with check (exists (
    select 1 from events where id = event_files.event_id and user_id = auth.uid()
  ));

-- file_validations: scoped through event_files → events
create policy "file_validations_user" on file_validations for all
  using (exists (
    select 1 from event_files ef
    join events e on ef.event_id = e.id
    where ef.id = file_validations.file_id and e.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from event_files ef
    join events e on ef.event_id = e.id
    where ef.id = file_validations.file_id and e.user_id = auth.uid()
  ));

-- validation_rows: scoped through file_validations → event_files → events
create policy "validation_rows_user" on validation_rows for all
  using (exists (
    select 1 from file_validations fv
    join event_files ef on fv.file_id = ef.id
    join events e on ef.event_id = e.id
    where fv.id = validation_rows.validation_id and e.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from file_validations fv
    join event_files ef on fv.file_id = ef.id
    join events e on ef.event_id = e.id
    where fv.id = validation_rows.validation_id and e.user_id = auth.uid()
  ));

-- Storage: authenticated users only (file paths are already scoped by event_id via RLS above)
create policy "uploads_authenticated" on storage.objects
  for all
  using (bucket_id = 'uploads' and auth.role() = 'authenticated')
  with check (bucket_id = 'uploads' and auth.role() = 'authenticated');
