import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DailyCompletion {
  id: string;
  user_id: string;
  completion_date: string;
  tasks_completed: number;
  total_tasks: number;
  all_completed: boolean;
  created_at: string;
}

export const useStreakTracking = (userId?: string) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const calculateStreak = (completions: DailyCompletion[]): number => {
    if (completions.length === 0) return 0;

    // Sort by date descending
    const sorted = [...completions]
      .filter((c) => c.all_completed)
      .sort((a, b) => new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime());

    if (sorted.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const completionDate = new Date(sorted[i].completion_date);
      completionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (completionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const calculateLongestStreak = (completions: DailyCompletion[]): number => {
    if (completions.length === 0) return 0;

    const sorted = [...completions]
      .filter((c) => c.all_completed)
      .sort((a, b) => new Date(a.completion_date).getTime() - new Date(b.completion_date).getTime());

    let maxStreak = 0;
    let currentStreak = 0;
    let previousDate: Date | null = null;

    for (const completion of sorted) {
      const date = new Date(completion.completion_date);
      date.setHours(0, 0, 0, 0);

      if (previousDate === null) {
        currentStreak = 1;
      } else {
        const dayDiff = Math.floor((date.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }

      previousDate = date;
    }

    return Math.max(maxStreak, currentStreak);
  };

  const loadStreaks = async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("daily_completions")
      .select("*")
      .eq("user_id", userId)
      .order("completion_date", { ascending: false });

    if (error) {
      console.error("Error loading streaks:", error);
    } else {
      const current = calculateStreak(data || []);
      const longest = calculateLongestStreak(data || []);
      setCurrentStreak(current);
      setLongestStreak(longest);
    }
    setLoading(false);
  };

  const updateDailyCompletion = async (tasksCompleted: number, totalTasks: number) => {
    if (!userId) return;

    const today = new Date().toISOString().split("T")[0];
    const allCompleted = tasksCompleted === totalTasks && totalTasks > 0;

    const { data: existing } = await supabase
      .from("daily_completions")
      .select("*")
      .eq("user_id", userId)
      .eq("completion_date", today)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("daily_completions")
        .update({
          tasks_completed: tasksCompleted,
          total_tasks: totalTasks,
          all_completed: allCompleted,
        })
        .eq("id", existing.id);

      if (error) console.error("Error updating daily completion:", error);
    } else {
      const { error } = await supabase.from("daily_completions").insert({
        user_id: userId,
        completion_date: today,
        tasks_completed: tasksCompleted,
        total_tasks: totalTasks,
        all_completed: allCompleted,
      });

      if (error) console.error("Error creating daily completion:", error);
    }

    // Reload streaks and check for milestones
    const previousStreak = currentStreak;
    await loadStreaks();

    // Check for milestone celebrations
    if (allCompleted && tasksCompleted > 0) {
      const newStreak = await calculateCurrentStreak();
      if (newStreak > previousStreak) {
        checkMilestone(newStreak);
      }
    }
  };

  const calculateCurrentStreak = async (): Promise<number> => {
    if (!userId) return 0;

    const { data } = await supabase
      .from("daily_completions")
      .select("*")
      .eq("user_id", userId)
      .order("completion_date", { ascending: false });

    return calculateStreak(data || []);
  };

  const checkMilestone = (streak: number) => {
    const milestones = [3, 7, 14, 30, 50, 100];
    
    if (milestones.includes(streak)) {
      const messages = {
        3: "🔥 3-day streak! You're on fire!",
        7: "🌟 Week streak! Amazing consistency!",
        14: "💪 2-week streak! You're unstoppable!",
        30: "🏆 30-day streak! Incredible dedication!",
        50: "🎯 50-day streak! You're a productivity legend!",
        100: "👑 100-day streak! You've mastered productivity!",
      };

      toast({
        title: "🎉 Milestone Achieved!",
        description: messages[streak as keyof typeof messages],
        duration: 8000,
      });
    }
  };

  useEffect(() => {
    if (userId) {
      loadStreaks();
    } else {
      setLoading(false);
    }
  }, [userId]);

  return {
    currentStreak,
    longestStreak,
    loading,
    updateDailyCompletion,
    loadStreaks,
  };
};
