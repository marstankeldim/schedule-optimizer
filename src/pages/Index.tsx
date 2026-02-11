import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
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
import { MonthlyCalendar } from "@/components/MonthlyCalendar";
import { GoalsSidebar } from "@/components/GoalsSidebar";
import { TaskHistory } from "@/components/TaskHistory";
import { CalendarImport } from "@/components/CalendarImport";
import { FocusMode } from "@/components/FocusMode";
import { SchedulePreferences } from "@/components/SchedulePreferences";
import { WeeklyOptimizationSettings } from "@/components/WeeklyOptimizationSettings";
import { WorkloadBalanceChart } from "@/components/WorkloadBalanceChart";
import {
  Sparkles,
  Trash2,
  Calendar,
  Clock,
  Coffee,
  LogOut,
  Save,
  History,
  CheckCircle2,
  BarChart3,
  GitBranch,
  Focus,
  Bell,
  ListTodo,
  Menu,
  Upload,
  WandSparkles,
  Flame,
  Trophy,
  HeartPulse,
  Target,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGoalTracking } from "@/hooks/useGoalTracking";
import { useStreakTracking } from "@/hooks/useStreakTracking";
import { useAchievements } from "@/hooks/useAchievements";
import { useBreakNotifications } from "@/hooks/useBreakNotifications";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { StreakTracker } from "@/components/StreakTracker";
import { Achievements } from "@/components/Achievements";
import { MentalHealthRewards } from "@/components/MentalHealthRewards";
import { CompletionCelebration } from "@/components/CompletionCelebration";
import { PlanMyDay } from "@/components/PlanMyDay";

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
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeLeftTab, setActiveLeftTab] = useState<
    "menu" | "history" | "alerts" | "import" | "plan" | "streak" | "achievements" | "wellness" | "goals" | null
  >(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { checkAndUpdateGoals } = useGoalTracking(session?.user?.id);
  const {
    currentStreak,
    longestStreak,
    loading: streakLoading,
    updateDailyCompletion,
  } = useStreakTracking(session?.user?.id);
  const { checkTaskCompletionAchievements, checkSpeedDemon, checkStreakAchievements } = useAchievements(
    session?.user?.id,
  );
  const { scheduleBreakNotifications, notificationsEnabled, checkPermissions } = useBreakNotifications(
    session?.user?.id,
  );

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!session && event === "SIGNED_OUT") {
        navigate("/auth");
      }
    });

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
      const [startHour, startMin] = task.startTime.split(":").map(Number);
      const [endHour, endMin] = task.endTime.split(":").map(Number);
      const start = new Date(now);
      const end = new Date(now);
      start.setHours(startHour, startMin, 0, 0);
      end.setHours(endHour, endMin, 0, 0);
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
    } else {
      const loadedTasks = (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        time: t.preferred_time || undefined,
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
        preferred_time: newTask.time || null,
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
        time: (data as any).preferred_time || undefined,
        duration: data.duration,
        energyLevel: data.energy_level as "high" | "medium" | "low",
        priority: data.priority as "high" | "medium" | "low",
      };
      setTasks((prev) => [...prev, task]);

      // Smart task insertion: If schedule exists, insert into free slots
      if (schedule.length > 0) {
        const firstIncompleteIndex = schedule.findIndex((t) => !t.isBreak && !completedTaskIds.has(t.id));

        if (firstIncompleteIndex !== -1) {
          // Calculate new times based on insertion point
          const insertTime = parseTime(schedule[firstIncompleteIndex].startTime);
          const newScheduledTask: ScheduledTask = {
            ...task,
            startTime: formatTime(insertTime),
            endTime: formatTime(insertTime + task.duration),
          };

          // Recalculate subsequent tasks
          const updatedSchedule = [...schedule];
          updatedSchedule.splice(firstIncompleteIndex, 0, newScheduledTask);

          // Recalculate all times after insertion
          let currentTime = insertTime;
          for (let i = firstIncompleteIndex; i < updatedSchedule.length; i++) {
            updatedSchedule[i].startTime = formatTime(currentTime);
            currentTime += updatedSchedule[i].duration;
            updatedSchedule[i].endTime = formatTime(currentTime);
          }

          setSchedule(updatedSchedule);

          toast({
            title: "Task added to schedule",
            description: `"${task.title}" has been inserted into your schedule`,
          });
          return;
        }
      }

      toast({
        title: "Task added",
        description: `"${task.title}" has been added to your task list`,
      });
    }
  };

  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  const getScheduleItemCount = (scheduleData: unknown): number => {
    if (Array.isArray(scheduleData)) return scheduleData.length;
    if (scheduleData && typeof scheduleData === "object") {
      return Object.values(scheduleData).reduce((sum, day) => sum + (Array.isArray(day) ? day.length : 0), 0);
    }
    return 0;
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

    const { data, error } = await supabase.from("tasks").insert(tasksToInsert).select();

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
        description:
          planningPeriod === "week"
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
    const scheduleData = Object.keys(weeklySchedule).length > 0 ? { weeklySchedule } : schedule;

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
      const [hours, minutes] = task.startTime.split(":").map(Number);
      const today = new Date();
      const scheduledTime = new Date(today.setHours(hours, minutes, 0, 0));

      let breakType = "regular";
      if (task.title.toLowerCase().includes("hydration") || task.title.includes("💧")) {
        breakType = "hydration";
      } else if (
        task.title.toLowerCase().includes("breakfast") ||
        task.title.toLowerCase().includes("lunch") ||
        task.title.toLowerCase().includes("dinner")
      ) {
        breakType = "meal";
      }

      await supabase.from("break_adherence").upsert(
        {
          user_id: session.user.id,
          break_type: breakType,
          break_title: task.title,
          scheduled_time: scheduledTime.toISOString(),
          taken: true,
          taken_at: new Date().toISOString(),
          duration_minutes: task.duration,
          date: today.toISOString().split("T")[0],
        },
        {
          onConflict: "user_id,break_title,scheduled_time",
        },
      );

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
    const nonBreakTasks = schedule.filter((t) => !t.isBreak);
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

        // Show celebration when all tasks complete
        setTimeout(() => {
          setShowCelebration(true);
        }, 500);
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

    const { error } = await supabase.from("tasks").delete().eq("user_id", session.user.id);

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

    const { data, error } = await supabase.from("tasks").insert(tasksToAdd).select();

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
          const dependencyMappings = incompleteTasks.reduce(
            (acc, task, idx) => {
              acc[task.id] = addedTasks[idx].id;
              return acc;
            },
            {} as Record<string, string>,
          );

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
        <header className="mb-8">
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
              <Button
                variant="outline"
                onClick={() => navigate("/ai-insights")}
                className="bg-primary/10 hover:bg-primary/20 border-primary/30"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Insights
              </Button>
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
            <h1 className="text-5xl font-bold text-foreground mb-3 tracking-tight">Schedule Optimizer</h1>
            <p className="text-xl text-muted-foreground">
              AI-powered task scheduling that adapts to your energy levels and priorities
            </p>
          </div>
        </header>

        <div className="fixed left-0 top-0 z-40 h-screen w-[128px] border-r border-border bg-card/95 backdrop-blur-sm">
          <div className="flex h-full flex-col gap-2 p-2">
            <div className="rounded-md border border-border bg-secondary/40 p-2 mb-2">
              <div className="flex items-center gap-2">
                {session?.user?.user_metadata?.avatar_url ? (
                  <div className="h-8 w-8 shrink-0 rounded-full overflow-hidden border border-border">
                    <img
                      src={session.user.user_metadata.avatar_url}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/20 border border-border flex items-center justify-center text-xs font-semibold text-primary">
                    {(session?.user?.user_metadata?.full_name?.[0] ||
                      session?.user?.user_metadata?.name?.[0] ||
                      session?.user?.email?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </div>
                )}
                <p className="text-xs text-foreground font-medium truncate">
                  {session?.user?.user_metadata?.full_name ||
                    session?.user?.user_metadata?.name ||
                    session?.user?.email?.split("@")[0] ||
                    "User"}
                </p>
              </div>
            </div>

            <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab("menu")}>
              <Menu className="w-3.5 h-3.5" />
              menu
            </button>
            <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab("plan")}>
              <WandSparkles className="w-3.5 h-3.5" />
              plan
            </button>
            <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab("import")}>
              <Upload className="w-3.5 h-3.5" />
              import
            </button>
            <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab("goals")}>
              <Target className="w-3.5 h-3.5" />
              goals
            </button>
            <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab("history")}>
              <History className="w-3.5 h-3.5" />
              history
            </button>
            <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab("alerts")}>
              <Bell className="w-3.5 h-3.5" />
              alerts
            </button>
            <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab("streak")}>
              <Flame className="w-3.5 h-3.5" />
              streak
            </button>
            <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab("achievements")}>
              <Trophy className="w-3.5 h-3.5" />
              achievements
            </button>
            <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab("wellness")}>
              <HeartPulse className="w-3.5 h-3.5" />
              wellness
            </button>
            {activeLeftTab && (
              <button className="text-xs text-left px-2 py-1 rounded hover:bg-secondary flex items-center gap-1.5" onClick={() => setActiveLeftTab(null)}>
                <X className="w-3.5 h-3.5" />
                close
              </button>
            )}
            <div className="mt-auto px-2 pt-2 text-[10px] leading-tight text-muted-foreground border-t border-border/60">
              <p>chronos 0.1</p>
              <p>All rights reserved C2025</p>
            </div>
          </div>
        </div>

        {activeLeftTab && (
          <div className="fixed inset-0 z-30 bg-background/70" onClick={() => setActiveLeftTab(null)}>
            <div
              className="box-scroll absolute left-[128px] top-0 h-full w-[min(520px,calc(100vw-128px))] overflow-y-auto border-r border-border bg-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {activeLeftTab === "history" && (
                <Card className="p-6 bg-gradient-card border-border shadow-card">
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
                            {new Date(saved.created_at).toLocaleDateString()} • Start: {saved.start_time} •{" "}
                            {getScheduleItemCount(saved.schedule_data)} items
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            handleLoadSchedule(saved);
                            setActiveLeftTab(null);
                          }}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Load
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {activeLeftTab === "alerts" && (
                <Card className="p-6 bg-gradient-card border-border shadow-card">
                  <h2 className="text-2xl font-semibold text-foreground mb-4">Alerts</h2>
                  <Button
                    variant="outline"
                    onClick={checkPermissions}
                    className="bg-accent/10 hover:bg-accent/20 border-accent/30"
                  >
                    Enable Break Alerts
                  </Button>
                </Card>
              )}

              {activeLeftTab === "import" && session?.user && (
                <CalendarImport
                  userId={session.user.id}
                  onEventsImported={() => {
                    toast({
                      title: "Calendar updated",
                      description: "Your schedule optimization will now consider your calendar events",
                    });
                  }}
                />
              )}

              {activeLeftTab === "plan" && session?.user && (
                <PlanMyDay
                  userId={session.user.id}
                  existingTasks={tasks}
                  onTasksGenerated={(newTasks) => {
                    setTasks((prev) => [...prev, ...newTasks]);
                  }}
                />
              )}

              {activeLeftTab === "streak" && (
                <Card className="p-6 bg-gradient-card border-border shadow-card">
                  <StreakTracker currentStreak={currentStreak} longestStreak={longestStreak} loading={streakLoading} />
                </Card>
              )}

              {activeLeftTab === "achievements" && session?.user && (
                <Achievements userId={session.user.id} currentStreak={currentStreak} />
              )}

              {activeLeftTab === "wellness" && session?.user && (
                <MentalHealthRewards userId={session.user.id} />
              )}

              {activeLeftTab === "goals" && session?.user && (
                <GoalsSidebar userId={session.user.id} onGoalAchieved={checkAndUpdateGoals} />
              )}

              {activeLeftTab === "menu" && (
                <div className="space-y-6">
                  <Card className="p-4">
                    <Label className="text-sm font-medium mb-3 block">Planning Period</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={planningPeriod === "tomorrow" ? "default" : "outline"}
                        onClick={() => setPlanningPeriod("tomorrow")}
                        className="flex-1"
                      >
                        Tomorrow
                      </Button>
                      <Button
                        type="button"
                        variant={planningPeriod === "week" ? "default" : "outline"}
                        onClick={() => setPlanningPeriod("week")}
                        className="flex-1"
                      >
                        Whole Week
                      </Button>
                    </div>

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
                                setWorkdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
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
                    onRecurringCreated={() => setRecurringTasksKey((prev) => prev + 1)}
                  />
                  <TaskTemplates onSelectTemplate={handleAddTask} />
                  {session?.user && <RecurringTasks key={recurringTasksKey} userId={session.user.id} onTasksGenerated={loadTasks} />}

                  {tasks.length > 0 && (
                    <Button
                      size="lg"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 py-6 text-lg font-semibold"
                      onClick={handleOptimizeSchedule}
                      disabled={isOptimizing}
                    >
                      {isOptimizing ? "Optimizing..." : "Optimize My Schedule"}
                    </Button>
                  )}

                  {session?.user && <SchedulePreferences userId={session.user.id} />}
                  {session?.user && planningPeriod === "week" && <WeeklyOptimizationSettings userId={session.user.id} />}
                  {session?.user && <TaskHistory userId={session.user.id} />}
                  {Object.keys(weeklySchedule).length > 0 && <WorkloadBalanceChart weeklySchedule={weeklySchedule} />}
                </div>
              )}
            </div>
          </div>
        )}

        <main className="space-y-6 ml-[140px]">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-2xl font-semibold text-foreground">Calendar</h2>
            </div>
            <MonthlyCalendar
              weeklySchedule={weeklySchedule}
              dailySchedule={schedule}
              completedTaskIds={completedTaskIds}
              onTaskComplete={(task, day) => {
                setCompletedTaskIds((prev) => new Set([...prev, task.id]));
                if (task.isBreak && session?.user) {
                  const [hours, minutes] = task.startTime.split(":").map(Number);
                  const scheduledDate = new Date(day);
                  const scheduledTime = new Date(scheduledDate.setHours(hours, minutes, 0, 0));
                  let breakType = "regular";
                  if (task.title.toLowerCase().includes("hydration") || task.title.includes("💧")) {
                    breakType = "hydration";
                  } else if (
                    task.title.toLowerCase().includes("breakfast") ||
                    task.title.toLowerCase().includes("lunch") ||
                    task.title.toLowerCase().includes("dinner")
                  ) {
                    breakType = "meal";
                  }
                  supabase.from("break_adherence").upsert(
                    {
                      user_id: session.user.id,
                      break_type: breakType,
                      break_title: task.title,
                      scheduled_time: scheduledTime.toISOString(),
                      taken: true,
                      taken_at: new Date().toISOString(),
                      duration_minutes: task.duration,
                      date: scheduledTime.toISOString().split("T")[0],
                    },
                    { onConflict: "user_id,break_title,scheduled_time" },
                  );
                }
                if (!task.isBreak && session?.user) {
                  supabase
                    .from("completed_tasks")
                    .insert({
                      user_id: session.user.id,
                      task_title: task.title,
                      task_duration: task.duration,
                      energy_level: task.energyLevel,
                      priority: task.priority,
                    })
                    .then(({ error }) => {
                      if (!error) {
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
              onTaskCreate={(day, startTime, duration, title) => {
                const [startHour, startMin] = startTime.split(":").map(Number);
                const endMinutesTotal = startHour * 60 + startMin + duration;
                const endHour = Math.floor(endMinutesTotal / 60);
                const endMin = endMinutesTotal % 60;
                const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

                const newTask: ScheduledTask = {
                  id: crypto.randomUUID(),
                  title: title?.trim() || "New Event",
                  duration,
                  energyLevel: "medium",
                  priority: "medium",
                  startTime,
                  endTime,
                };

                if (Object.keys(weeklySchedule).length > 0) {
                  const dayName = format(day, "EEEE");
                  setWeeklySchedule((prev) => {
                    const updated = { ...prev };
                    if (!updated[dayName]) updated[dayName] = [];
                    updated[dayName] = [...updated[dayName], newTask].sort((a, b) => a.startTime.localeCompare(b.startTime));
                    return updated;
                  });
                } else {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  const tomorrowDayName = format(tomorrow, "EEEE");
                  const targetDayName = format(day, "EEEE");

                  if (isSameDay(day, tomorrow)) {
                    setSchedule((prev) => [...prev, newTask].sort((a, b) => a.startTime.localeCompare(b.startTime)));
                  } else {
                    const seededWeeklySchedule: Record<string, ScheduledTask[]> = {
                      [tomorrowDayName]: [...schedule],
                    };
                    seededWeeklySchedule[targetDayName] = [...(seededWeeklySchedule[targetDayName] || []), newTask].sort((a, b) =>
                      a.startTime.localeCompare(b.startTime),
                    );
                    setWeeklySchedule(seededWeeklySchedule);
                  }
                }

                toast({
                  title: "Event created",
                  description: `${startTime} - ${endTime} (${duration} min)`,
                });
              }}
              onTaskReschedule={(task, fromDay, toDay, newStartTime) => {
                const fromDayName = format(fromDay, "EEEE");
                const toDayName = format(toDay, "EEEE");
                const [startHour, startMin] = newStartTime.split(":").map(Number);
                const endMinutes = startHour * 60 + startMin + task.duration;
                const endHour = Math.floor(endMinutes / 60);
                const endMin = endMinutes % 60;
                const newEndTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

                const updatedTask = { ...task, startTime: newStartTime, endTime: newEndTime };

                if (Object.keys(weeklySchedule).length > 0) {
                  setWeeklySchedule((prev) => {
                    const updated = { ...prev };
                    if (updated[fromDayName]) {
                      updated[fromDayName] = updated[fromDayName].filter((t) => t.id !== task.id);
                    }
                    if (!updated[toDayName]) {
                      updated[toDayName] = [];
                    }
                    updated[toDayName] = [...updated[toDayName], updatedTask].sort((a, b) =>
                      a.startTime.localeCompare(b.startTime),
                    );
                    return updated;
                  });
                } else {
                  setSchedule((prev) => {
                    const filtered = prev.filter((t) => t.id !== task.id);
                    return [...filtered, updatedTask].sort((a, b) => a.startTime.localeCompare(b.startTime));
                  });
                }
              }}
              onTaskResize={(task, day, newDuration) => {
                const dayName = format(day, "EEEE");
                const [startHour, startMin] = task.startTime.split(":").map(Number);
                const endMinutes = startHour * 60 + startMin + newDuration;
                const endHour = Math.floor(endMinutes / 60);
                const endMin = endMinutes % 60;
                const newEndTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

                const updatedTask = { ...task, duration: newDuration, endTime: newEndTime };

                if (Object.keys(weeklySchedule).length > 0) {
                  setWeeklySchedule((prev) => {
                    const updated = { ...prev };
                    if (updated[dayName]) {
                      updated[dayName] = updated[dayName].map((t) => (t.id === task.id ? updatedTask : t));
                    }
                    return updated;
                  });
                } else {
                  setSchedule((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
                }
              }}
              onTaskUpdate={(task, day, updates) => {
                const dayName = format(day, "EEEE");
                if (Object.keys(weeklySchedule).length > 0) {
                  setWeeklySchedule((prev) => {
                    const updated = { ...prev };
                    if (updated[dayName]) {
                      updated[dayName] = updated[dayName].map((t) => (t.id === task.id ? { ...t, ...updates } : t));
                    }
                    return updated;
                  });
                } else {
                  setSchedule((prev) => prev.map((t) => (t.id === task.id ? { ...t, ...updates } : t)));
                }
              }}
              onTaskDelete={(task, day) => {
                const dayName = format(day, "EEEE");
                if (Object.keys(weeklySchedule).length > 0) {
                  setWeeklySchedule((prev) => {
                    const updated = { ...prev };
                    if (updated[dayName]) {
                      updated[dayName] = updated[dayName].filter((t) => t.id !== task.id);
                    }
                    return updated;
                  });
                } else {
                  setSchedule((prev) => prev.filter((t) => t.id !== task.id));
                }
                toast({
                  title: "Task deleted",
                  description: `"${task.title}" has been removed from the schedule`,
                });
              }}
            />
          </main>

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

        {/* Completion Celebration */}
        {showCelebration && (
          <CompletionCelebration
            onContinue={() => {
              setShowCelebration(false);
              setSchedule([]);
              setWeeklySchedule({});
              setCompletedTaskIds(new Set());
            }}
            tasksCompleted={schedule.filter((t) => !t.isBreak).length}
            currentStreak={currentStreak}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
