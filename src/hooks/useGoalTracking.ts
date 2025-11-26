import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useGoalTracking = (userId: string | undefined) => {
  const { toast } = useToast();

  const checkAndUpdateGoals = async () => {
    if (!userId) return;

    // Get current week's goals
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const { data: goals } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .eq("achieved", false)
      .gte("week_start", weekStart.toISOString().split('T')[0]);

    if (!goals || goals.length === 0) return;

    for (const goal of goals) {
      let currentValue = 0;

      if (goal.type === "weekly_tasks") {
        // Count completed tasks this week
        const { data: completedTasks } = await supabase
          .from("completed_tasks")
          .select("id")
          .eq("user_id", userId)
          .gte("completed_at", weekStart.toISOString());

        currentValue = completedTasks?.length || 0;
      } else if (goal.type === "break_adherence") {
        // Calculate break adherence percentage
        const { data: schedules } = await supabase
          .from("schedules")
          .select("schedule_data, break_preference")
          .eq("user_id", userId)
          .gte("created_at", weekStart.toISOString());

        if (schedules && schedules.length > 0) {
          const schedulesWithBreaks = schedules.filter(
            (s) => s.break_preference !== "none"
          ).length;
          currentValue = Math.round((schedulesWithBreaks / schedules.length) * 100);
        }
      } else if (goal.type === "energy_balance") {
        // Calculate energy level balance
        const { data: completedTasks } = await supabase
          .from("completed_tasks")
          .select("energy_level")
          .eq("user_id", userId)
          .gte("completed_at", weekStart.toISOString());

        if (completedTasks && completedTasks.length > 0) {
          const energyCounts = { high: 0, medium: 0, low: 0 };
          completedTasks.forEach((task) => {
            energyCounts[task.energy_level as keyof typeof energyCounts]++;
          });

          // Calculate how balanced the distribution is (perfect balance = 100%)
          const total = completedTasks.length;
          const ideal = total / 3;
          const variance = Math.sqrt(
            (Math.pow(energyCounts.high - ideal, 2) +
              Math.pow(energyCounts.medium - ideal, 2) +
              Math.pow(energyCounts.low - ideal, 2)) /
              3
          );
          const balance = Math.max(0, 100 - (variance / ideal) * 100);
          currentValue = Math.round(balance);
        }
      }

      // Update goal progress
      const achieved = currentValue >= goal.target_value;
      
      const { error } = await supabase
        .from("goals")
        .update({
          current_value: currentValue,
          achieved,
          achieved_at: achieved && !goal.achieved ? new Date().toISOString() : goal.achieved_at,
        })
        .eq("id", goal.id);

      if (error) {
        console.error("Error updating goal:", error);
      }

      // Show notification if goal just achieved
      if (achieved && !goal.achieved) {
        // Save achievement to history
        await supabase.from("goal_achievements").insert({
          user_id: userId,
          goal_type: goal.type,
          target_value: goal.target_value,
          achieved_value: currentValue,
        });

        // Show celebration toast
        toast({
          title: "🎉 Goal Achieved!",
          description: `You've reached your ${getGoalLabel(goal.type)} goal!`,
          duration: 5000,
        });
      }
    }
  };

  const getGoalLabel = (type: string) => {
    switch (type) {
      case "weekly_tasks":
        return "Weekly Tasks";
      case "break_adherence":
        return "Break Adherence";
      case "energy_balance":
        return "Energy Balance";
      default:
        return type;
    }
  };

  return { checkAndUpdateGoals };
};
