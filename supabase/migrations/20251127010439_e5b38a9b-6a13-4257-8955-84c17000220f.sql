-- Create table to track applied recommendations
CREATE TABLE IF NOT EXISTS public.recommendation_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommendation_title TEXT NOT NULL,
  recommendation_category TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success_rating INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recommendation_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own recommendation applications"
ON public.recommendation_applications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recommendation applications"
ON public.recommendation_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendation applications"
ON public.recommendation_applications
FOR UPDATE
USING (auth.uid() = user_id);