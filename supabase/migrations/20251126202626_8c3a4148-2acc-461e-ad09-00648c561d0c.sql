-- Create break adherence tracking table
CREATE TABLE public.break_adherence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  break_type TEXT NOT NULL,
  break_title TEXT NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  taken BOOLEAN DEFAULT false,
  taken_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.break_adherence ENABLE ROW LEVEL SECURITY;

-- Create policies for break adherence
CREATE POLICY "Users can view their own break adherence"
  ON public.break_adherence
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own break adherence"
  ON public.break_adherence
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own break adherence"
  ON public.break_adherence
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_break_adherence_user_date ON public.break_adherence(user_id, date);
CREATE INDEX idx_break_adherence_scheduled_time ON public.break_adherence(user_id, scheduled_time);