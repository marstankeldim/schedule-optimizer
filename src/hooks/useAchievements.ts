import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  category: "speed" | "time" | "streak" | "volume";
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Complete 10 tasks before 10 AM",
    icon: "🌅",
    requirement: 10,
    category: "time",
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Complete 20 tasks after 8 PM",
    icon: "🦉",
    requirement: 20,
    category: "time",
  },
  {
    id: "speed_demon",
    name: "Speed Demon",
    description: "Complete all daily tasks 2+ hours early",
    icon: "⚡",
    requirement: 1,
    category: "speed",
  },
  {
    id: "century_club",
    name: "Century Club",
    description: "Complete 100 total tasks",
    icon: "💯",
    requirement: 100,
    category: "volume",
  },
  {
    id: "productivity_pro",
    name: "Productivity Pro",
    description: "Complete 500 total tasks",
    icon: "🏆",
    requirement: 500,
    category: "volume",
  },
  {
    id: "week_warrior",
    name: "Week Warrior",
    description: "Maintain a 7-day completion streak",
    icon: "🔥",
    requirement: 7,
    category: "streak",
  },
  {
    id: "month_master",
    name: "Month Master",
    description: "Maintain a 30-day completion streak",
    icon: "👑",
    requirement: 30,
    category: "streak",
  },
];

interface UserAchievement {
  id: string;
  achievement_id: string;
  progress: number;
  unlocked_at: string;
}

export const useAchievements = (userId?: string) => {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadAchievements = async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("user_achievements")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading achievements:", error);
    } else {
      setUserAchievements(data || []);
    }
    setLoading(false);
  };

  const checkAndUnlockAchievement = async (achievementId: string, progress: number) => {
    if (!userId) return;

    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) return;

    const existing = userAchievements.find((ua) => ua.achievement_id === achievementId);

    if (existing) {
      // Update progress if not yet unlocked
      if (existing.progress < achievement.requirement) {
        const newProgress = Math.min(progress, achievement.requirement);
        
        await supabase
          .from("user_achievements")
          .update({ progress: newProgress })
          .eq("id", existing.id);

        // Check if just unlocked
        if (newProgress >= achievement.requirement && existing.progress < achievement.requirement) {
          toast({
            title: "🎉 Achievement Unlocked!",
            description: `${achievement.icon} ${achievement.name}: ${achievement.description}`,
            duration: 8000,
          });
        }

        setUserAchievements((prev) =>
          prev.map((ua) =>
            ua.id === existing.id ? { ...ua, progress: newProgress } : ua
          )
        );
      }
    } else {
      // Create new achievement entry
      const newProgress = Math.min(progress, achievement.requirement);
      const { data, error } = await supabase
        .from("user_achievements")
        .insert({
          user_id: userId,
          achievement_id: achievementId,
          progress: newProgress,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating achievement:", error);
      } else if (data) {
        setUserAchievements((prev) => [...prev, data]);

        // Show toast if unlocked immediately
        if (newProgress >= achievement.requirement) {
          toast({
            title: "🎉 Achievement Unlocked!",
            description: `${achievement.icon} ${achievement.name}: ${achievement.description}`,
            duration: 8000,
          });
        }
      }
    }
  };

  const checkTaskCompletionAchievements = async (completionTime: Date) => {
    if (!userId) return;

    const hour = completionTime.getHours();

    // Early Bird: before 10 AM
    if (hour < 10) {
      const { data } = await supabase
        .from("completed_tasks")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .gte("completed_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
        .lt("completed_at", new Date(new Date().setHours(10, 0, 0, 0)).toISOString());

      const earlyBirdCount = data?.length || 0;
      await checkAndUnlockAchievement("early_bird", earlyBirdCount);
    }

    // Night Owl: after 8 PM
    if (hour >= 20) {
      const { data } = await supabase
        .from("completed_tasks")
        .select("id", { count: "exact" })
        .eq("user_id", userId)
        .gte("completed_at", new Date(new Date().setHours(20, 0, 0, 0)).toISOString());

      const nightOwlCount = data?.length || 0;
      await checkAndUnlockAchievement("night_owl", nightOwlCount);
    }

    // Volume achievements: total tasks completed
    const { data: allCompleted } = await supabase
      .from("completed_tasks")
      .select("id", { count: "exact" })
      .eq("user_id", userId);

    const totalTasks = allCompleted?.length || 0;
    await checkAndUnlockAchievement("century_club", totalTasks);
    await checkAndUnlockAchievement("productivity_pro", totalTasks);
  };

  const checkSpeedDemon = async (scheduledEndTime: string, actualCompletionTime: Date) => {
    if (!userId) return;

    // Parse scheduled end time (HH:MM format)
    const [endHours, endMinutes] = scheduledEndTime.split(":").map(Number);
    const scheduledEnd = new Date();
    scheduledEnd.setHours(endHours, endMinutes, 0, 0);

    // Check if completed 2+ hours early
    const hoursEarly = (scheduledEnd.getTime() - actualCompletionTime.getTime()) / (1000 * 60 * 60);

    if (hoursEarly >= 2) {
      await checkAndUnlockAchievement("speed_demon", 1);
    }
  };

  const checkStreakAchievements = async (currentStreak: number) => {
    if (!userId) return;

    await checkAndUnlockAchievement("week_warrior", currentStreak);
    await checkAndUnlockAchievement("month_master", currentStreak);
  };

  const getUnlockedAchievements = () => {
    return userAchievements
      .filter((ua) => {
        const achievement = ACHIEVEMENTS.find((a) => a.id === ua.achievement_id);
        return achievement && ua.progress >= achievement.requirement;
      })
      .map((ua) => {
        const achievement = ACHIEVEMENTS.find((a) => a.id === ua.achievement_id);
        return { ...ua, ...achievement };
      });
  };

  const getProgressAchievements = () => {
    return userAchievements
      .filter((ua) => {
        const achievement = ACHIEVEMENTS.find((a) => a.id === ua.achievement_id);
        return achievement && ua.progress < achievement.requirement;
      })
      .map((ua) => {
        const achievement = ACHIEVEMENTS.find((a) => a.id === ua.achievement_id);
        return { ...ua, ...achievement };
      });
  };

  const getLockedAchievements = () => {
    return ACHIEVEMENTS.filter(
      (achievement) => !userAchievements.some((ua) => ua.achievement_id === achievement.id)
    );
  };

  useEffect(() => {
    loadAchievements();
  }, [userId]);

  return {
    userAchievements,
    loading,
    checkTaskCompletionAchievements,
    checkSpeedDemon,
    checkStreakAchievements,
    getUnlockedAchievements,
    getProgressAchievements,
    getLockedAchievements,
    loadAchievements,
  };
};
