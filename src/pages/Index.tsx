import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskInput, Task } from "@/components/TaskInput";
import { ScheduleTimeline, ScheduledTask } from "@/components/ScheduleTimeline";
import { GoalsSidebar } from "@/components/GoalsSidebar";
import { Sparkles, Trash2, Calendar, Clock, Coffee, LogOut, Save, History, CheckCircle2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoalTracking } from "@/hooks/useGoalTracking";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduledTask[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [breakPreference, setBreakPreference] = useState<"none" | "short" | "long" | "auto">("auto");
  const [scheduleName, setScheduleName] = useState("");
  const [savedSchedules, setSavedSchedules] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkAndUpdateGoals } = useGoalTracking(session?.user?.id);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session && event === 'SIGNED_OUT') {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        // Load saved data after confirming session
        setTimeout(() => {
          loadSavedSchedules();
          loadTasks();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadTasks = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading tasks:", error);
    } else if (data && data.length > 0) {
      const loadedTasks = data.map((t) => ({
        id: t.id,
        title: t.title,
        duration: t.duration,
        energyLevel: t.energy_level as "high" | "medium" | "low",
        priority: t.priority as "high" | "medium" | "low",
      }));
      setTasks(loadedTasks);
    }
  };

  const loadSavedSchedules = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading schedules:", error);
    } else {
      setSavedSchedules(data || []);
    }
  };

  const handleAddTask = async (newTask: Omit<Task, "id">) => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: session.user.id,
        title: newTask.title,
        duration: newTask.duration,
        energy_level: newTask.energyLevel,
        priority: newTask.priority,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save task",
        variant: "destructive",
      });
    } else {
      const task: Task = {
        id: data.id,
        title: data.title,
        duration: data.duration,
        energyLevel: data.energy_level as "high" | "medium" | "low",
        priority: data.priority as "high" | "medium" | "low",
      };
      setTasks([...tasks, task]);
      toast({
        title: "Task added",
        description: `"${task.title}" has been added to your task list`,
      });
    }
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
        body: { tasks, startTime, breakPreference },
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

  const handleSaveSchedule = async () => {
    if (!session?.user || schedule.length === 0) return;

    const name = scheduleName || `Schedule ${new Date().toLocaleDateString()}`;

    const { error } = await supabase.from("schedules").insert({
      user_id: session.user.id,
      name,
      start_time: startTime,
      break_preference: breakPreference,
      schedule_data: schedule as any,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save schedule",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Schedule saved!",
        description: `"${name}" has been saved to your history`,
      });
      setScheduleName("");
      loadSavedSchedules();
      // Check and update goals after saving schedule
      setTimeout(() => {
        checkAndUpdateGoals();
      }, 100);
    }
  };

  const handleLoadSchedule = (savedSchedule: any) => {
    setSchedule(savedSchedule.schedule_data);
    setStartTime(savedSchedule.start_time);
    setBreakPreference(savedSchedule.break_preference);
    setShowHistory(false);
    toast({
      title: "Schedule loaded",
      description: `"${savedSchedule.name}" has been loaded`,
    });
  };

  const handleMarkTaskComplete = async (task: ScheduledTask) => {
    if (!session?.user || task.isBreak) return;

    const { error } = await supabase.from("completed_tasks").insert({
      user_id: session.user.id,
      task_title: task.title,
      task_duration: task.duration,
      energy_level: task.energyLevel,
      priority: task.priority,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to mark task as complete",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Task completed!",
        description: `"${task.title}" has been marked as complete`,
      });
      // Check and update goals after task completion
      setTimeout(() => {
        checkAndUpdateGoals();
      }, 100);
    }
  };

  const handleClearTasks = async () => {
    if (!session?.user) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", session.user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to clear tasks",
        variant: "destructive",
      });
    } else {
      setTasks([]);
      setSchedule([]);
      toast({
        title: "Tasks cleared",
        description: "All tasks have been removed",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You've been successfully logged out",
    });
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard")}
                className="bg-secondary hover:bg-secondary/80 border-border"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              {savedSchedules.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowHistory(!showHistory)}
                  className="bg-secondary hover:bg-secondary/80 border-border"
                >
                  <History className="w-4 h-4 mr-2" />
                  History ({savedSchedules.length})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="bg-secondary hover:bg-secondary/80 border-border"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-bold text-foreground mb-3 tracking-tight">
              Schedule Optimizer
            </h1>
            <p className="text-xl text-muted-foreground">
              AI-powered task scheduling that adapts to your energy levels and priorities
            </p>
          </div>
        </header>

        {/* History View */}
        {showHistory && savedSchedules.length > 0 && (
          <Card className="p-6 bg-gradient-card border-border shadow-card mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Schedule History</h2>
            <div className="space-y-2">
              {savedSchedules.map((saved) => (
                <div
                  key={saved.id}
                  className="p-4 bg-secondary rounded-lg border border-border flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-medium text-foreground">{saved.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(saved.created_at).toLocaleDateString()} • Start: {saved.start_time} • {saved.schedule_data.length} items
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLoadSchedule(saved)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Load
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Input */}
          <div className="lg:col-span-2 space-y-6">
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

            {/* Start Time & Break Preferences */}
            {tasks.length > 0 && (
              <Card className="p-6 bg-gradient-card border-border shadow-card space-y-4">
                <div>
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
                </div>

                <div>
                  <Label htmlFor="breaks" className="text-foreground flex items-center gap-2 mb-3">
                    <Coffee className="w-4 h-4 text-primary" />
                    Break preferences
                  </Label>
                  <Select value={breakPreference} onValueChange={(v) => setBreakPreference(v as typeof breakPreference)}>
                    <SelectTrigger id="breaks" className="bg-secondary border-border focus:border-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No breaks</SelectItem>
                      <SelectItem value="short">Short breaks (5-10 min)</SelectItem>
                      <SelectItem value="long">Long breaks (30+ min)</SelectItem>
                      <SelectItem value="auto">Auto (AI decides based on energy)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    Breaks help prevent burnout and maintain productivity
                  </p>
                </div>
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

          {/* Right Column - Schedule & Goals */}
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-foreground">Your Optimized Schedule</h2>
              {schedule.length > 0 && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Schedule name (optional)"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    className="w-48 bg-secondary border-border"
                  />
                  <Button
                    onClick={handleSaveSchedule}
                    variant="outline"
                    className="bg-secondary hover:bg-secondary/80 border-primary/30"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>
            <ScheduleTimeline schedule={schedule} onMarkComplete={handleMarkTaskComplete} />
            
            {/* Goals Sidebar */}
            {session?.user && (
              <GoalsSidebar userId={session.user.id} onGoalAchieved={checkAndUpdateGoals} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
