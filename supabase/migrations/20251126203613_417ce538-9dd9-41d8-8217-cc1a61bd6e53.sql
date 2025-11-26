-- Add weekly optimization preferences to user_preferences table
ALTER TABLE public.user_preferences
ADD COLUMN max_hours_per_day integer DEFAULT 8,
ADD COLUMN preferred_deep_work_days text[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday'],
ADD COLUMN min_break_minutes_per_hour integer DEFAULT 10,
ADD COLUMN allow_evening_work boolean DEFAULT true,
ADD COLUMN evening_cutoff_time text DEFAULT '18:00';

COMMENT ON COLUMN public.user_preferences.max_hours_per_day IS 'Maximum focused work hours per day for weekly optimization';
COMMENT ON COLUMN public.user_preferences.preferred_deep_work_days IS 'Preferred days for scheduling high-energy deep work tasks';
COMMENT ON COLUMN public.user_preferences.min_break_minutes_per_hour IS 'Minimum break minutes per hour of work';
COMMENT ON COLUMN public.user_preferences.allow_evening_work IS 'Allow scheduling tasks after 6pm';
COMMENT ON COLUMN public.user_preferences.evening_cutoff_time IS 'Time when evening work should stop';