-- Step 1: Enable Row Level Security (RLS) on the attendance_logs table
-- This ensures that no one can access the table unless a policy allows them to.
alter table public.attendance_logs enable row level security;

-- Step 2: Create a policy to allow public (anonymous) users to insert new logs.
-- This is required for the application to save check-in data.
-- The policy checks for `true`, meaning any insert attempt will be allowed.
create policy "Enable insert for public users"
on public.attendance_logs
for insert
to anon
with check (true);
