-- Keep deployed databases compatible with the profile phone field.
alter table profiles add column if not exists phone text;