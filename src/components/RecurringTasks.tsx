import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  recurrence_pattern: any;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  preferred_time?: string;
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

  // Form state
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low">("medium");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Weekdays by default
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [preferredTime, setPreferredTime] = useState("09:00");

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

  const createRecurringTask = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a task title",
        variant: "destructive",
      });
      return;
    }

    if (recurrenceType === "weekly" && selectedDays.length === 0) {
      toast({
        title: "Select days",
        description: "Please select at least one day for weekly recurrence",
        variant: "destructive",
      });
      return;
    }

    let recurrencePattern = {};
    switch (recurrenceType) {
      case "weekly":
        recurrencePattern = { daysOfWeek: selectedDays };
        break;
      case "monthly":
        recurrencePattern = { dayOfMonth };
        break;
    }

    const { error } = await supabase.from("recurring_tasks").insert({
      user_id: userId,
      title: title.trim(),
      duration,
      energy_level: energyLevel,
      priority,
      recurrence_type: recurrenceType,
      recurrence_pattern: recurrencePattern,
      preferred_time: preferredTime,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create recurring task",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Recurring task created!",
        description: `"${title}" will repeat ${recurrenceType}`,
      });
      // Reset form
      setTitle("");
      setDuration(30);
      setEnergyLevel("medium");
      setPriority("medium");
      setRecurrenceType("daily");
      setSelectedDays([1, 2, 3, 4, 5]);
      setDayOfMonth(1);
      setPreferredTime("09:00");
      setIsOpen(false);
      loadRecurringTasks();
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
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
    <Card className="p-6 bg-gradient-card border-border shadow-card ring-2 ring-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Repeat className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Recurring Tasks</h3>
            <p className="text-xs text-muted-foreground">Create tasks that repeat automatically</p>
          </div>
        </div>
        <div className="flex gap-2">
          {recurringTasks.length > 0 && (
            <Button
              size="default"
              onClick={generateTasksForToday}
              className="bg-primary hover:bg-primary/90 shadow-glow font-semibold"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Add Today's Tasks
            </Button>
          )}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="default" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                New Recurring Task
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Recurring Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Morning standup"
                    className="mt-1.5 bg-secondary border-border"
                    maxLength={200}
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={5}
                    max={480}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                    className="mt-1.5 bg-secondary border-border"
                  />
                </div>

                <div>
                  <Label htmlFor="energyLevel">Energy Level</Label>
                  <Select value={energyLevel} onValueChange={(v: any) => setEnergyLevel(v)}>
                    <SelectTrigger id="energyLevel" className="mt-1.5 bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Energy</SelectItem>
                      <SelectItem value="medium">Medium Energy</SelectItem>
                      <SelectItem value="low">Low Energy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger id="priority" className="mt-1.5 bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High Priority</SelectItem>
                      <SelectItem value="medium">Medium Priority</SelectItem>
                      <SelectItem value="low">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="preferredTime">Preferred Time</Label>
                  <Input
                    id="preferredTime"
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="mt-1.5 bg-secondary border-border"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Preferred time to schedule this task
                  </p>
                </div>

                <div>
                  <Label htmlFor="recurrenceType">Recurrence Pattern</Label>
                  <Select
                    value={recurrenceType}
                    onValueChange={(v: any) => setRecurrenceType(v)}
                  >
                    <SelectTrigger id="recurrenceType" className="mt-1.5 bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly (Select Days)</SelectItem>
                      <SelectItem value="monthly">Monthly (Specific Day)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceType === "weekly" && (
                  <div>
                    <Label className="mb-2 block">Select Days</Label>
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS_OF_WEEK.map((day, index) => (
                        <div key={day} className="flex flex-col items-center">
                          <Checkbox
                            id={`day-${index}`}
                            checked={selectedDays.includes(index)}
                            onCheckedChange={() => toggleDay(index)}
                            className="mb-1"
                          />
                          <Label
                            htmlFor={`day-${index}`}
                            className="text-xs cursor-pointer"
                          >
                            {day}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {recurrenceType === "monthly" && (
                  <div>
                    <Label htmlFor="dayOfMonth">Day of Month</Label>
                    <Select
                      value={dayOfMonth.toString()}
                      onValueChange={(v) => setDayOfMonth(parseInt(v))}
                    >
                      <SelectTrigger id="dayOfMonth" className="mt-1.5 bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            Day {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={createRecurringTask}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Create Recurring Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {recurringTasks.length === 0 ? (
        <div className="text-center py-10 px-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
            <Repeat className="w-12 h-12 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-2">No recurring tasks yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Set up tasks that repeat daily, weekly, or monthly - they'll automatically appear in your schedule!
          </p>
          <Button
            onClick={() => setIsOpen(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Recurring Task
          </Button>
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
