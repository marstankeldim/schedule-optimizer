-- Create task_dependencies table
CREATE TABLE public.task_dependencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_tasks CHECK (task_id != depends_on_task_id),
  CONSTRAINT unique_dependency UNIQUE (task_id, depends_on_task_id)
);

-- Enable RLS
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own task dependencies"
  ON public.task_dependencies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task dependencies"
  ON public.task_dependencies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task dependencies"
  ON public.task_dependencies
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX idx_task_dependencies_task_id ON public.task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);
CREATE INDEX idx_task_dependencies_user_id ON public.task_dependencies(user_id);