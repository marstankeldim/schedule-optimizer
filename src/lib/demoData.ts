import { supabase } from "@/integrations/supabase/client";

export const populateDemoData = async (userId: string) => {
  // Sample tasks
  const sampleTasks = [
    { title: "Review project proposals", duration: 45, energy_level: "high", priority: "high" },
    { title: "Team standup meeting", duration: 30, energy_level: "medium", priority: "medium" },
    { title: "Reply to emails", duration: 20, energy_level: "low", priority: "low" },
    { title: "Deep work: UI design", duration: 90, energy_level: "high", priority: "high" },
    { title: "Lunch break", duration: 60, energy_level: "low", priority: "low" },
    { title: "Code review", duration: 45, energy_level: "medium", priority: "medium" },
    { title: "Update documentation", duration: 30, energy_level: "low", priority: "medium" },
  ];

  // Insert sample tasks
  await supabase.from("tasks").insert(
    sampleTasks.map(task => ({ ...task, user_id: userId }))
  );

  // Sample recurring tasks
  const sampleRecurringTasks = [
    {
      user_id: userId,
      title: "Morning exercise",
      duration: 30,
      energy_level: "high",
      priority: "medium",
      recurrence_type: "daily" as const,
      recurrence_pattern: {},
      preferred_time: "07:00",
      is_active: true,
    },
    {
      user_id: userId,
      title: "Weekly team sync",
      duration: 60,
      energy_level: "medium",
      priority: "high",
      recurrence_type: "weekly" as const,
      recurrence_pattern: { days: ["Monday"] },
      preferred_time: "10:00",
      is_active: true,
    },
    {
      user_id: userId,
      title: "Review weekly goals",
      duration: 30,
      energy_level: "medium",
      priority: "medium",
      recurrence_type: "weekly" as const,
      recurrence_pattern: { days: ["Friday"] },
      preferred_time: "16:00",
      is_active: true,
    },
  ];

  await supabase.from("recurring_tasks").insert(sampleRecurringTasks);

  // Sample completed tasks for history
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const sampleCompletedTasks = [
    {
      user_id: userId,
      task_title: "Client presentation",
      task_duration: 60,
      energy_level: "high",
      priority: "high",
      completed_at: yesterday.toISOString(),
    },
    {
      user_id: userId,
      task_title: "Budget planning",
      task_duration: 45,
      energy_level: "medium",
      priority: "medium",
      completed_at: yesterday.toISOString(),
    },
    {
      user_id: userId,
      task_title: "File organization",
      task_duration: 20,
      energy_level: "low",
      priority: "low",
      completed_at: yesterday.toISOString(),
    },
  ];

  await supabase.from("completed_tasks").insert(sampleCompletedTasks);

  // Sample achievements
  const sampleAchievements = [
    { user_id: userId, achievement_id: "first_task", progress: 100 },
    { user_id: userId, achievement_id: "task_master_10", progress: 100 },
    { user_id: userId, achievement_id: "early_bird", progress: 7 },
    { user_id: userId, achievement_id: "streak_3", progress: 100 },
  ];

  await supabase.from("user_achievements").insert(sampleAchievements);

  // Sample daily completions for streak
  const dates = [-3, -2, -1].map(offset => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toISOString().split('T')[0];
  });

  const sampleCompletions = dates.map(date => ({
    user_id: userId,
    completion_date: date,
    tasks_completed: 5,
    total_tasks: 5,
    all_completed: true,
  }));

  await supabase.from("daily_completions").insert(sampleCompletions);

  // Sample calendar event
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);
  
  const endTime = new Date(tomorrow);
  endTime.setHours(15, 30, 0, 0);

  await supabase.from("calendar_events").insert({
    user_id: userId,
    title: "Client meeting",
    start_time: tomorrow.toISOString(),
    end_time: endTime.toISOString(),
    all_day: false,
  });
};
