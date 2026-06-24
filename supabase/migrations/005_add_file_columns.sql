alter table event_files
  add column if not exists headers jsonb,
  add column if not exists selected_columns jsonb;
