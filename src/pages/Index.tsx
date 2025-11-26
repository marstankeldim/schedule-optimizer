import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TaskInput, Task } from "@/components/TaskInput";
import { ScheduleTimeline, ScheduledTask } from "@/components/ScheduleTimeline";
import { Sparkles, Trash2, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduledTask[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const { toast } = useToast();

  const handleAddTask = (newTask: Omit<Task, "id">) => {
    const task: Task = {
      ...newTask,
      id: Math.random().toString(36).substr(2, 9),
    };
    setTasks([...tasks, task]);
    toast({
      title: "Task added",
      description: `"${task.title}" has been added to your task list`,
    });
  };

  const handleOptimizeSchedule = async () => {
    if (tasks.length === 0) {
      toast({
        title: "No tasks to optimize",
        description: "Please add some tasks first",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-schedule", {
        body: { tasks, startTime },
      });

      if (error) throw error;

      setSchedule(data.schedule);
      toast({
        title: "Schedule optimized!",
        description: "Your tasks have been arranged for optimal productivity",
      });
    } catch (error) {
      console.error("Error optimizing schedule:", error);
      toast({
        title: "Optimization failed",
        description: "There was an error optimizing your schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleClearTasks = () => {
    setTasks([]);
    setSchedule([]);
    toast({
      title: "Tasks cleared",
      description: "All tasks have been removed",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-5xl font-bold text-foreground mb-3 tracking-tight">
            Schedule Optimizer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered task scheduling that adapts to your energy levels and priorities
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Add Your Tasks</h2>
              <TaskInput onAddTask={handleAddTask} />
            </div>

            {/* Task List */}
            {tasks.length > 0 && (
              <Card className="p-6 bg-gradient-card border-border shadow-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Tasks ({tasks.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearTasks}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-secondary rounded-lg border border-border"
                    >
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.duration}min • {task.energyLevel} energy • {task.priority} priority
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Start Time Selection */}
            {tasks.length > 0 && (
              <Card className="p-6 bg-gradient-card border-border shadow-card">
                <Label htmlFor="startTime" className="text-foreground flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-primary" />
                  What time does your day start?
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-secondary border-border focus:border-primary transition-colors"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Your schedule will be optimized starting from this time
                </p>
              </Card>
            )}

            {/* Optimize Button */}
            {tasks.length > 0 && (
              <Button
                onClick={handleOptimizeSchedule}
                disabled={isOptimizing}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow transition-all h-14 text-lg"
              >
                {isOptimizing ? (
                  <>Optimizing your schedule...</>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Optimize with AI
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Right Column - Schedule */}
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Your Optimized Schedule</h2>
            <ScheduleTimeline schedule={schedule} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
