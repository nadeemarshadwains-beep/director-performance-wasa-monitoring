-- Create the first Admin identity in Supabase Authentication first.
-- Then replace the UUID and name below and run this as a project database owner.
insert into public.profiles (id, full_name, role, director_id)
values ('REPLACE_WITH_AUTH_USER_UUID', 'System Administrator', 'admin', null);
