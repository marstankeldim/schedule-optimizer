-- Create flow_state_sessions table to track focus periods
CREATE TABLE public.flow_state_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  average_energy_level TEXT,
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  interruptions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flow_state_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own flow sessions" 
ON public.flow_state_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own flow sessions" 
ON public.flow_state_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flow sessions" 
ON public.flow_state_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_flow_sessions_user_time ON public.flow_state_sessions(user_id, start_time DESC);