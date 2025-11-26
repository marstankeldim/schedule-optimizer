import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Repeat, Plus, Trash2, Calendar, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "./TaskInput";

interface RecurringTask {
  id: string;
  title: string;
  duration: number;
  energy_level: string;
  priority: string;
  recurrence_type: "daily" | "weekly" | "monthly" | "custom";
  recurrence_pattern: any; // Using any to match Supabase Json type
  is_active: boolean;
  start_date: string;
  end_date?: string;
}

interface RecurringTasksProps {
  userId: string;
  onGenerateTasks: (tasks: Omit<Task, "id">[]) => void;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const RecurringTasks = ({ userId, onGenerateTasks }: RecurringTasksProps) => {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRecurringTasks();
  }, [userId]);

  const loadRecurringTasks = async () => {
    const { data, error } = await supabase
      .from("recurring_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading recurring tasks:", error);
    } else {
      setRecurringTasks(data || []);
    }
  };

  const toggleTaskActive = async (taskId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("recurring_tasks")
      .update({ is_active: isActive })
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update recurring task",
        variant: "destructive",
      });
    } else {
      loadRecurringTasks();
      toast({
        title: isActive ? "Recurring task enabled" : "Recurring task disabled",
      });
    }
  };

  const deleteRecurringTask = async (taskId: string) => {
    const { error } = await supabase
      .from("recurring_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete recurring task",
        variant: "destructive",
      });
    } else {
      loadRecurringTasks();
      toast({
        title: "Recurring task deleted",
      });
    }
  };

  const generateTasksForToday = async () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const tasksToAdd: Omit<Task, "id">[] = [];

    for (const recurringTask of recurringTasks) {
      if (!recurringTask.is_active) continue;

      const pattern = recurringTask.recurrence_pattern as {
        daysOfWeek?: number[];
        dayOfMonth?: number;
        interval?: number;
      };

      let shouldGenerate = false;

      switch (recurringTask.recurrence_type) {
        case "daily":
          shouldGenerate = true;
          break;
        case "weekly":
          if (pattern.daysOfWeek?.includes(dayOfWeek)) {
            shouldGenerate = true;
          }
          break;
        case "monthly":
          if (pattern.dayOfMonth === today.getDate()) {
            shouldGenerate = true;
          }
          break;
      }

      if (shouldGenerate) {
        tasksToAdd.push({
          title: recurringTask.title,
          duration: recurringTask.duration,
          energyLevel: recurringTask.energy_level as "high" | "medium" | "low",
          priority: recurringTask.priority as "high" | "medium" | "low",
        });
      }
    }

    if (tasksToAdd.length > 0) {
      onGenerateTasks(tasksToAdd);
      toast({
        title: "Recurring tasks added",
        description: `${tasksToAdd.length} recurring task(s) added to your task list`,
      });
    } else {
      toast({
        title: "No recurring tasks for today",
        description: "No active recurring tasks match today's schedule",
      });
    }
  };

  const getRecurrenceDescription = (task: RecurringTask) => {
    const pattern = task.recurrence_pattern as {
      daysOfWeek?: number[];
      dayOfMonth?: number;
      interval?: number;
    };

    switch (task.recurrence_type) {
      case "daily":
        return "Every day";
      case "weekly":
        if (pattern.daysOfWeek) {
          const days = pattern.daysOfWeek
            .map((d) => DAYS_OF_WEEK[d])
            .join(", ");
          return `Every ${days}`;
        }
        return "Weekly";
      case "monthly":
        return `Day ${pattern.dayOfMonth} of every month`;
      default:
        return task.recurrence_type;
    }
  };

  const getEnergyColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-energy-high/20 text-energy-high border-energy-high/30";
      case "medium":
        return "bg-energy-medium/20 text-energy-medium border-energy-medium/30";
      case "low":
        return "bg-energy-low/20 text-energy-low border-energy-low/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Recurring Tasks</h3>
        </div>
        <div className="flex gap-2">
          {recurringTasks.length > 0 && (
            <Button
              size="sm"
              onClick={generateTasksForToday}
              className="bg-primary hover:bg-primary/90"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Today's Tasks
            </Button>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="bg-secondary border-border">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle>Create Recurring Task</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Create recurring tasks from the task input above or from templates. Set them as recurring after adding them.
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {recurringTasks.length === 0 ? (
        <div className="text-center py-8">
          <Repeat className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No recurring tasks yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create tasks that automatically repeat on your schedule
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recurringTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 bg-secondary rounded-lg border border-border flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-foreground">{task.title}</h4>
                  <Badge variant="outline" className={getEnergyColor(task.energy_level)}>
                    <Zap className="w-3 h-3 mr-1" />
                    {task.energy_level}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat className="w-3 h-3" />
                    {getRecurrenceDescription(task)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={task.is_active}
                    onCheckedChange={(checked) => toggleTaskActive(task.id, checked)}
                  />
                  <Label className="sr-only">Active</Label>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteRecurringTask(task.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
