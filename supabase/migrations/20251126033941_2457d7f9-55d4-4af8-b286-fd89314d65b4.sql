-- Add preferred_time column to recurring_tasks table
ALTER TABLE recurring_tasks
ADD COLUMN IF NOT EXISTS preferred_time text;

-- Add recurring_task_id column to tasks table to track which tasks came from recurring tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurring_task_id uuid REFERENCES recurring_tasks(id) ON DELETE SET NULL;