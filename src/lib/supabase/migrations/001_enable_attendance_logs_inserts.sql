-- src/lib/supabase/migrations/001_enable_attendance_logs_inserts.sql

-- STEP 1: Enable Row Level Security (RLS) on the attendance_logs table.
-- This is a foundational security step. By default, it denies all access.
-- If RLS is already on, this command does nothing.
alter table public.attendance_logs enable row level security;


-- STEP 2: Create the policy to allow inserts.
-- This command creates a new security policy named "Allow public insert access"
-- on the "attendance_logs" table.
create policy "Allow public insert access"
on "public"."attendance_logs"

-- This specifies that the policy applies to INSERT operations.
for insert

-- "to public" means this policy applies to any user, including anonymous
-- users who are using your app's public API key.
to public

-- The WITH CHECK expression is the rule that must be true for the insert
-- to be allowed. By setting it to "true", we are saying that any
-- insert operation is permitted, without any additional conditions.
with check (true);
