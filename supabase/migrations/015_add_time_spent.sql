-- Add time_spent column to anonymous_sessions
alter table anonymous_sessions add column if not exists time_spent int; -- seconds
