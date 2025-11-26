-- Create enum for recurrence types
CREATE TYPE public.recurrence_type AS ENUM ('daily', 'weekly', 'monthly', 'custom');

-- Create recurring_tasks table
CREATE TABLE public.recurring_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL,
  energy_level TEXT NOT NULL,
  priority TEXT NOT NULL,
  recurrence_type public.recurrence_type NOT NULL,
  recurrence_pattern JSONB NOT NULL DEFAULT '{}'::jsonb,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  last_generated_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recurring tasks"
  ON public.recurring_tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring tasks"
  ON public.recurring_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring tasks"
  ON public.recurring_tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring tasks"
  ON public.recurring_tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_recurring_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_recurring_tasks_updated_at
  BEFORE UPDATE ON public.recurring_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recurring_tasks_updated_at();

-- Create index for faster queries
CREATE INDEX idx_recurring_tasks_user_id ON public.recurring_tasks(user_id);
CREATE INDEX idx_recurring_tasks_is_active ON public.recurring_tasks(is_active) WHERE is_active = true;