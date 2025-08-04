-- This script enables Row Level Security (RLS) on the attendance_logs table and
-- adds a policy to allow new rows to be inserted by any user. This is required
-- for the check-in functionality of the application to be able to save attendance records.
--
-- To run this script:
-- 1. Go to your Supabase project dashboard.
-- 2. In the left sidebar, click on "SQL Editor".
-- 3. Click "+ New query".
-- 4. Copy the entire content of this file and paste it into the editor.
-- 5. Click the "RUN" button.

-- Step 1: Enable Row Level Security on the table.
-- This is a security best practice. By default, RLS is off. When it's on,
-- all access is denied until a policy grants it.
alter table public.attendance_logs enable row level security;

-- Step 2: Create a policy to allow anyone to insert a new log.
-- This policy is what allows your application to save check-in data.
-- 'as permissive' means the policy grants access.
-- 'for insert' specifies that this policy only applies to INSERT operations.
-- 'to public' means this policy applies to any user, including anonymous public users.
-- 'with check (true)' is the rule that must be satisfied. 'true' means any insert is allowed.
create policy "Enable insert for public users"
on public.attendance_logs
as permissive
for insert
to public
with check (true);
