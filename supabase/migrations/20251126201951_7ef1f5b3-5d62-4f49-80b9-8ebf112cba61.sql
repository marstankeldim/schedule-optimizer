-- Create user preferences table for meal breaks and reminders
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  breakfast_time TEXT DEFAULT '08:00',
  breakfast_duration INTEGER DEFAULT 20,
  lunch_time TEXT DEFAULT '12:30',
  lunch_duration INTEGER DEFAULT 60,
  dinner_time TEXT DEFAULT '18:30',
  dinner_duration INTEGER DEFAULT 60,
  enable_nutrition_reminders BOOLEAN DEFAULT true,
  enable_hydration_reminders BOOLEAN DEFAULT true,
  hydration_interval INTEGER DEFAULT 120,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_goals_updated_at();