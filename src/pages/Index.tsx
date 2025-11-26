import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskInput, Task } from "@/components/TaskInput";
import { TaskTemplates } from "@/components/TaskTemplates";
import { RecurringTasks } from "@/components/RecurringTasks";
import { TaskDependencies } from "@/components/TaskDependencies";
import { ScheduleTimeline, ScheduledTask } from "@/components/ScheduleTimeline";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { GoalsSidebar } from "@/components/GoalsSidebar";
import { TaskHistory } from "@/components/TaskHistory";
import { CalendarImport } from "@/components/CalendarImport";
import { FocusMode } from "@/components/FocusMode";
import { AIInsights } from "@/components/AIInsights";
import { SchedulePreferences } from "@/components/SchedulePreferences";
import { WeeklyOptimizationSettings } from "@/components/WeeklyOptimizationSettings";
import { WorkloadBalanceChart } from "@/components/WorkloadBalanceChart";
import { Sparkles, Trash2, Calendar, Clock, Coffee, LogOut, Save, History, CheckCircle2, BarChart3, GitBranch, Focus, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoalTracking } from "@/hooks/useGoalTracking";
import { useStreakTracking } from "@/hooks/useStreakTracking";
import { useAchievements } from "@/hooks/useAchievements";
import { useBreakNotifications } from "@/hooks/useBreakNotifications";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { StreakTracker } from "@/components/StreakTracker";
import { Achievements } from "@/components/Achievements";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedule, setSchedule] = useState<ScheduledTask[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, ScheduledTask[]>>({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [breakPreference, setBreakPreference] = useState<"none" | "short" | "long" | "auto">("auto");
  const [planningPeriod, setPlanningPeriod] = useState<"tomorrow" | "week">("tomorrow");
  const [workdays, setWorkdays] = useState<string[]>(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  const [scheduleName, setScheduleName] = useState("");
  const [savedSchedules, setSavedSchedules] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState<{ task: ScheduledTask; timeoutId: NodeJS.Timeout } | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [recurringTasksKey, setRecurringTasksKey] = useState(0);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [selectedTaskForDependency, setSelectedTaskForDependency] = useState<Task | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkAndUpdateGoals } = useGoalTracking(session?.user?.id);
  const { currentStreak, longestStreak, loading: streakLoading, updateDailyCompletion } = useStreakTracking(session?.user?.id);
  const { checkTaskCompletionAchievements, checkSpeedDemon, checkStreakAchievements } = useAchievements(session?.user?.id);
  const { scheduleBreakNotifications, notificationsEnabled, checkPermissions } = useBreakNotifications(session?.user?.id);

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

  // ESC key to exit focus mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusMode) {
        setIsFocusMode(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode]);

  const getCurrentTask = (): ScheduledTask | null => {
    if (schedule.length === 0) return null;

    const now = new Date();
    const currentTask = schedule.find((task) => {
      const start = new Date(task.startTime);
      const end = new Date(task.endTime);
      return now >= start && now <= end;
    });

    return currentTask || null;
  };

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

  const handleAddMultipleTasks = async (newTasks: Omit<Task, "id">[]) => {
    if (!session?.user) return;

    const tasksToInsert = newTasks.map((task) => ({
      user_id: session.user.id,
      title: task.title,
      duration: task.duration,
      energy_level: task.energyLevel,
      priority: task.priority,
    }));

    const { data, error } = await supabase
      .from("tasks")
      .insert(tasksToInsert)
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save tasks",
        variant: "destructive",
      });
    } else {
      const addedTasks: Task[] = data.map((d) => ({
        id: d.id,
        title: d.title,
        duration: d.duration,
        energyLevel: d.energy_level as "high" | "medium" | "low",
        priority: d.priority as "high" | "medium" | "low",
      }));
      setTasks([...tasks, ...addedTasks]);
      toast({
        title: "Tasks added",
        description: `${addedTasks.length} task(s) added to your task list`,
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
        body: { 
          tasks, 
          startTime, 
          breakPreference,
          userId: session?.user?.id,
          planningPeriod,
          workdays: planningPeriod === "week" ? workdays : undefined,
        },
      });

      if (error) throw error;

      if (planningPeriod === "week") {
        setWeeklySchedule(data.weeklySchedule);
        setSchedule([]); // Clear daily schedule
        
        // Schedule notifications for each day's breaks
        if (notificationsEnabled) {
          const today = new Date();
          Object.entries(data.weeklySchedule).forEach(([day, daySchedule], index) => {
            const scheduleDate = new Date(today);
            scheduleDate.setDate(today.getDate() + index);
            scheduleBreakNotifications(daySchedule as ScheduledTask[], scheduleDate);
          });
        }
      } else {
        setSchedule(data.schedule);
        setWeeklySchedule({}); // Clear weekly schedule
        
        // Schedule notifications for tomorrow's breaks
        if (notificationsEnabled) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          scheduleBreakNotifications(data.schedule, tomorrow);
        }
      }
      
      setCompletedTaskIds(new Set()); // Reset completed tasks for new schedule
      
      const notifMessage = notificationsEnabled 
        ? "Break notifications have been scheduled!"
        : "Enable notifications to get break reminders";
      
      toast({
        title: "Schedule optimized!",
        description: planningPeriod === "week" 
          ? `Your tasks have been distributed across the week. ${notifMessage}`
          : `Your tasks have been arranged for optimal productivity. ${notifMessage}`,
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
    if (!session?.user) return;
    
    const hasSchedule = schedule.length > 0 || Object.keys(weeklySchedule).length > 0;
    if (!hasSchedule) return;

    const name = scheduleName || `Schedule ${new Date().toLocaleDateString()}`;
    
    // Save either weekly or daily schedule
    const scheduleData = Object.keys(weeklySchedule).length > 0 
      ? { weeklySchedule } 
      : schedule;

    const { error } = await supabase.from("schedules").insert({
      user_id: session.user.id,
      name,
      start_time: startTime,
      break_preference: breakPreference,
      schedule_data: scheduleData as any,
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
    setCompletedTaskIds(new Set()); // Reset completed tasks for loaded schedule
    setStartTime(savedSchedule.start_time);
    setBreakPreference(savedSchedule.break_preference);
    setShowHistory(false);
    toast({
      title: "Schedule loaded",
      description: `"${savedSchedule.name}" has been loaded`,
    });
  };

  const handleUndoRemoval = () => {
    if (pendingRemoval) {
      clearTimeout(pendingRemoval.timeoutId);
      // Remove from completed tasks set
      setCompletedTaskIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(pendingRemoval.task.id);
        return newSet;
      });
      setPendingRemoval(null);
      toast({
        title: "Task restored",
        description: "Task completion cancelled",
      });
    }
  };

  const handleMarkTaskComplete = async (task: ScheduledTask) => {
    if (!session?.user) return;
    
    // Handle break completion separately
    if (task.isBreak) {
      setCompletedTaskIds((prev) => new Set([...prev, task.id]));
      
      // Track break adherence
      const [hours, minutes] = task.startTime.split(':').map(Number);
      const today = new Date();
      const scheduledTime = new Date(today.setHours(hours, minutes, 0, 0));
      
      let breakType = "regular";
      if (task.title.toLowerCase().includes('hydration') || task.title.includes('💧')) {
        breakType = "hydration";
      } else if (task.title.toLowerCase().includes('breakfast') || 
                 task.title.toLowerCase().includes('lunch') || 
                 task.title.toLowerCase().includes('dinner')) {
        breakType = "meal";
      }
      
      await supabase.from("break_adherence").upsert({
        user_id: session.user.id,
        break_type: breakType,
        break_title: task.title,
        scheduled_time: scheduledTime.toISOString(),
        taken: true,
        taken_at: new Date().toISOString(),
        duration_minutes: task.duration,
        date: today.toISOString().split('T')[0]
      }, {
        onConflict: 'user_id,break_title,scheduled_time'
      });
      
      toast({
        title: "Break completed!",
        description: `"${task.title}" marked as taken`,
      });
      
      return;
    }

    // Clear any existing pending removal
    if (pendingRemoval) {
      clearTimeout(pendingRemoval.timeoutId);
    }

    // Add to completed tasks set
    setCompletedTaskIds((prev) => new Set([...prev, task.id]));

    // Update daily completion tracking and check achievements
    const nonBreakTasks = schedule.filter(t => !t.isBreak);
    const completedCount = completedTaskIds.size + 1; // +1 for current task
    updateDailyCompletion(completedCount, nonBreakTasks.length);

    // Check achievements
    if (session?.user?.id) {
      checkTaskCompletionAchievements(new Date());
      
      // Check if all tasks are done (Speed Demon)
      if (completedCount === nonBreakTasks.length) {
        const lastTask = schedule[schedule.length - 1];
        if (lastTask && !lastTask.isBreak) {
          checkSpeedDemon(lastTask.endTime, new Date());
        }
        checkStreakAchievements(currentStreak + 1);
      }
    }

    // Set up 5-second undo window
    const timeoutId = setTimeout(async () => {
      // Actually complete the task after 5 seconds
      const { error } = await supabase.from("completed_tasks").insert({
        user_id: session.user.id,
        task_title: task.title,
        task_duration: task.duration,
        energy_level: task.energyLevel,
        priority: task.priority,
      });

      if (error) {
        console.error("Error saving completed task:", error);
        toast({
          title: "Error",
          description: "Failed to save completed task",
          variant: "destructive",
        });
      } else {
        setPendingRemoval(null);

        // Check and update goals after completing a task
        if (session?.user?.id) {
          await checkAndUpdateGoals();
        }
      }
    }, 5000);

    // Set pending removal state
    setPendingRemoval({ task, timeoutId });

    // Show undo toast
    toast({
      title: "Task Completed!",
      description: "Click undo within 5 seconds to cancel.",
      action: (
        <button
          onClick={handleUndoRemoval}
          className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Undo
        </button>
      ),
      duration: 5000,
    });
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

  const handleRescheduleToTomorrow = async () => {
    if (!session?.user || schedule.length === 0) return;

    // Get incomplete tasks (exclude breaks)
    const incompleteTasks = schedule.filter((t) => !t.isBreak);
    
    if (incompleteTasks.length === 0) {
      toast({
        title: "No tasks to reschedule",
        description: "All tasks have been completed!",
      });
      return;
    }

    // Add incomplete tasks back to the task list
    const tasksToAdd = incompleteTasks.map((t) => ({
      user_id: session.user.id,
      title: t.title,
      duration: t.duration,
      energy_level: t.energyLevel,
      priority: t.priority,
    }));

    const { data, error } = await supabase
      .from("tasks")
      .insert(tasksToAdd)
      .select();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reschedule tasks",
        variant: "destructive",
      });
    } else {
      const addedTasks: Task[] = data.map((d) => ({
        id: d.id,
        title: d.title,
        duration: d.duration,
        energyLevel: d.energy_level as "high" | "medium" | "low",
        priority: d.priority as "high" | "medium" | "low",
      }));

      // Copy dependencies for rescheduled tasks
      for (let i = 0; i < incompleteTasks.length; i++) {
        const oldTaskId = incompleteTasks[i].id;
        const newTaskId = addedTasks[i].id;

        // Get dependencies of the old task
        const { data: deps } = await supabase
          .from("task_dependencies")
          .select("depends_on_task_id")
          .eq("task_id", oldTaskId)
          .eq("user_id", session.user.id);

        // Map old dependency IDs to new ones
        if (deps && deps.length > 0) {
          const dependencyMappings = incompleteTasks.reduce((acc, task, idx) => {
            acc[task.id] = addedTasks[idx].id;
            return acc;
          }, {} as Record<string, string>);

          const newDeps = deps
            .map((dep) => ({
              user_id: session.user.id,
              task_id: newTaskId,
              depends_on_task_id: dependencyMappings[dep.depends_on_task_id] || dep.depends_on_task_id,
            }))
            .filter((dep) => dep.depends_on_task_id); // Only keep if dependency still exists

          if (newDeps.length > 0) {
            await supabase.from("task_dependencies").insert(newDeps);
          }
        }
      }

      setTasks([...tasks, ...addedTasks]);
      setSchedule([]);
      
      toast({
        title: "Tasks rescheduled",
        description: `${incompleteTasks.length} task(s) added to your task list for tomorrow`,
      });
    }
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
              {!notificationsEnabled && (
                <Button
                  variant="outline"
                  onClick={checkPermissions}
                  className="bg-accent/10 hover:bg-accent/20 border-accent/30"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Enable Break Alerts
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

        {schedule.length === 0 && Object.keys(weeklySchedule).length === 0 ? (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Input */}
            <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Add Your Tasks</h2>
              
              {/* Planning Period Selector */}
              <Card className="p-4 mb-4">
                <Label className="text-sm font-medium mb-3 block">Planning Period</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={planningPeriod === "tomorrow" ? "default" : "outline"}
                    onClick={() => setPlanningPeriod("tomorrow")}
                    className="flex-1"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Tomorrow
                  </Button>
                  <Button
                    type="button"
                    variant={planningPeriod === "week" ? "default" : "outline"}
                    onClick={() => setPlanningPeriod("week")}
                    className="flex-1"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Whole Week
                  </Button>
                </div>

                {/* Workdays Selector */}
                {planningPeriod === "week" && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Label className="text-sm font-medium mb-3 block">Workdays</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <Button
                          key={day}
                          type="button"
                          variant={workdays.includes(day) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setWorkdays(prev => 
                              prev.includes(day) 
                                ? prev.filter(d => d !== day)
                                : [...prev, day]
                            );
                          }}
                          className="text-xs"
                        >
                          {day.slice(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <TaskInput 
                onAddTask={handleAddTask}
                userId={session?.user?.id}
                onRecurringCreated={() => setRecurringTasksKey(prev => prev + 1)}
              />
            </div>

            {/* Task Templates */}
            <TaskTemplates onSelectTemplate={handleAddTask} />

            {/* Recurring Tasks */}
            {session?.user && (
              <RecurringTasks 
                key={recurringTasksKey}
                userId={session.user.id}
                onTasksGenerated={loadTasks}
              />
            )}

            {/* Calendar Import */}
            {session?.user && (
              <CalendarImport
                userId={session.user.id}
                onEventsImported={() => {
                  // Refresh calendar events when imported
                  toast({
                    title: "Calendar updated",
                    description: "Your schedule optimization will now consider your calendar events",
                  });
                }}
              />
            )}

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
                      className="p-3 bg-secondary rounded-lg border border-border flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{task.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.duration}min • {task.energyLevel} energy • {task.priority} priority
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedTaskForDependency(task);
                          setDependencyDialogOpen(true);
                        }}
                        className="hover:bg-primary/10 hover:text-primary"
                      >
                        <GitBranch className="w-4 h-4" />
                      </Button>
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

          {/* Right Column - Goals, Streak, and Achievements */}
          <div className="space-y-6">
            {/* Streak Tracker */}
            {session?.user && (
              <StreakTracker
                currentStreak={currentStreak}
                longestStreak={longestStreak}
                loading={streakLoading}
              />
            )}
            
            {/* Achievements */}
            {session?.user && (
              <Achievements userId={session.user.id} currentStreak={currentStreak} />
            )}

            {/* AI Insights */}
            {session?.user && (
              <AIInsights userId={session.user.id} />
            )}
            
            {/* Weekly Optimization Settings */}
            {session?.user && planningPeriod === "week" && (
              <WeeklyOptimizationSettings userId={session.user.id} />
            )}
            
            {/* Schedule Preferences */}
            {session?.user && (
              <SchedulePreferences userId={session.user.id} />
            )}
            
            {/* Goals Sidebar */}
            {session?.user && (
              <GoalsSidebar userId={session.user.id} onGoalAchieved={checkAndUpdateGoals} />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Goals, Streak, and Achievements Section at Top */}
          <div className="grid lg:grid-cols-3 gap-6">
            {session?.user && (
              <>
                <StreakTracker
                  currentStreak={currentStreak}
                  longestStreak={longestStreak}
                  loading={streakLoading}
                />
                <Achievements userId={session.user.id} currentStreak={currentStreak} />
                <GoalsSidebar userId={session.user.id} onGoalAchieved={checkAndUpdateGoals} />
              </>
            )}
          </div>

          {/* Fullscreen Schedule */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-foreground">
              {Object.keys(weeklySchedule).length > 0 ? "Your Weekly Schedule" : "Your Optimized Schedule"}
            </h2>
            <div className="flex gap-2">
              {schedule.length > 0 && (
                <Button
                  onClick={() => setIsFocusMode(true)}
                  variant="outline"
                  className="bg-primary/10 hover:bg-primary/20 border-primary/30"
                >
                  <Focus className="w-4 h-4 mr-2" />
                  Focus Mode
                </Button>
              )}
              <Button
                onClick={handleRescheduleToTomorrow}
                variant="outline"
                className="bg-secondary hover:bg-secondary/80 border-border"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Reschedule to Tomorrow
              </Button>
              <Button
                onClick={() => {
                  setSchedule([]);
                  setWeeklySchedule({});
                }}
                variant="outline"
                className="bg-secondary hover:bg-secondary/80 border-border"
              >
                Add More Tasks
              </Button>
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
          </div>
          
          {/* Show either weekly or daily schedule */}
          {Object.keys(weeklySchedule).length > 0 ? (
            <>
              <WorkloadBalanceChart weeklySchedule={weeklySchedule} />
              <WeeklyCalendar
                weeklySchedule={weeklySchedule}
                onMarkTaskComplete={(task, day) => {
                  // Update completed task IDs
                  setCompletedTaskIds((prev) => new Set([...prev, task.id]));

                // Handle break completion tracking
                if (task.isBreak && session?.user) {
                  const [hours, minutes] = task.startTime.split(':').map(Number);
                  const today = new Date();
                  const scheduledTime = new Date(today.setHours(hours, minutes, 0, 0));
                  
                  let breakType = "regular";
                  if (task.title.toLowerCase().includes('hydration') || task.title.includes('💧')) {
                    breakType = "hydration";
                  } else if (task.title.toLowerCase().includes('breakfast') || 
                             task.title.toLowerCase().includes('lunch') || 
                             task.title.toLowerCase().includes('dinner')) {
                    breakType = "meal";
                  }
                  
                  supabase.from("break_adherence").upsert({
                    user_id: session.user.id,
                    break_type: breakType,
                    break_title: task.title,
                    scheduled_time: scheduledTime.toISOString(),
                    taken: true,
                    taken_at: new Date().toISOString(),
                    duration_minutes: task.duration,
                    date: today.toISOString().split('T')[0]
                  }, {
                    onConflict: 'user_id,break_title,scheduled_time'
                  });
                }

                // Handle task completion tracking
                if (!task.isBreak && session?.user) {
                  supabase.from("completed_tasks").insert({
                    user_id: session.user.id,
                    task_title: task.title,
                    task_duration: task.duration,
                    energy_level: task.energyLevel,
                    priority: task.priority,
                  }).then(({ error }) => {
                    if (error) {
                      console.error("Error saving completed task:", error);
                    } else {
                      // Check and update goals
                      checkAndUpdateGoals();
                      checkTaskCompletionAchievements(new Date());
                    }
                  });
                }

                toast({
                  title: "Task Completed!",
                  description: `"${task.title}" has been marked as complete`,
                });
              }}
              completedTaskIds={completedTaskIds}
            />
            </>
          ) : (
            <ScheduleTimeline 
              schedule={schedule} 
              onMarkComplete={handleMarkTaskComplete}
              onReorder={setSchedule}
              userId={session?.user?.id}
              completedTaskIds={completedTaskIds}
            />
          )}
        </div>
      )}

        {/* Task History Section */}
        {session && schedule.length === 0 && Object.keys(weeklySchedule).length === 0 && (
          <div className="mt-8">
            <TaskHistory userId={session.user.id} />
          </div>
        )}

        {/* Task Dependencies Dialog */}
        {selectedTaskForDependency && session?.user && (
          <TaskDependencies
            open={dependencyDialogOpen}
            onOpenChange={setDependencyDialogOpen}
            task={selectedTaskForDependency}
            allTasks={tasks}
            userId={session.user.id}
            onSuccess={loadTasks}
          />
        )}

        {/* Focus Mode */}
        {isFocusMode && (
          <FocusMode
            currentTask={getCurrentTask()}
            onExit={() => setIsFocusMode(false)}
            onComplete={(taskId) => {
              const task = schedule.find((t) => t.id === taskId);
              if (task) handleMarkTaskComplete(task);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
