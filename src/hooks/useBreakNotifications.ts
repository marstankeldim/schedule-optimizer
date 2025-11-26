import { useState, useEffect, useCallback } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ScheduledTask } from "@/components/ScheduleTimeline";

interface BreakNotification {
  id: number;
  title: string;
  body: string;
  schedule: { at: Date };
}

export const useBreakNotifications = (userId: string | undefined) => {
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const result = await LocalNotifications.checkPermissions();
      if (result.display === "granted") {
        setNotificationsEnabled(true);
      } else {
        const requested = await LocalNotifications.requestPermissions();
        setNotificationsEnabled(requested.display === "granted");
      }
    } catch (error) {
      console.error("Error checking notification permissions:", error);
    }
  };

  const scheduleBreakNotifications = useCallback(async (schedule: ScheduledTask[], scheduleDate: Date) => {
    if (!userId || !notificationsEnabled) return;

    try {
      // Cancel existing notifications
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const notifications: BreakNotification[] = [];
      let notificationId = 1;

      // Track breaks in database
      const breakRecords = [];

      for (const task of schedule) {
        if (task.isBreak) {
          const [hours, minutes] = task.startTime.split(':').map(Number);
          const notificationTime = new Date(scheduleDate);
          notificationTime.setHours(hours, minutes - 5, 0, 0); // 5 minutes before break

          // Only schedule if in the future
          if (notificationTime > new Date()) {
            let body = "";
            let breakType = "regular";

            if (task.title.toLowerCase().includes('hydration') || task.title.includes('💧')) {
              body = "Time to hydrate! 💧 Grab a glass of water and refresh yourself.";
              breakType = "hydration";
            } else if (task.title.toLowerCase().includes('breakfast')) {
              body = "Breakfast time! 🍳 Fuel your day with a nutritious meal.";
              breakType = "meal";
            } else if (task.title.toLowerCase().includes('lunch')) {
              body = "Lunch break! 🍽️ Time for a healthy, balanced meal.";
              breakType = "meal";
            } else if (task.title.toLowerCase().includes('dinner')) {
              body = "Dinner time! 🍴 Enjoy a nourishing evening meal.";
              breakType = "meal";
            } else {
              body = `Take a ${task.duration}-minute break to recharge!`;
            }

            notifications.push({
              id: notificationId++,
              title: task.title,
              body,
              schedule: { at: notificationTime }
            });

            // Track in database
            breakRecords.push({
              user_id: userId,
              break_type: breakType,
              break_title: task.title,
              scheduled_time: new Date(scheduleDate.setHours(hours, minutes, 0, 0)).toISOString(),
              duration_minutes: task.duration,
              date: scheduleDate.toISOString().split('T')[0]
            });
          }
        }
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications });
        
        // Insert break records into database
        if (breakRecords.length > 0) {
          await supabase.from("break_adherence").insert(breakRecords);
        }

        toast({
          title: "Break notifications scheduled!",
          description: `${notifications.length} break reminders set up for today`,
        });
      }
    } catch (error) {
      console.error("Error scheduling notifications:", error);
      toast({
        title: "Notification error",
        description: "Failed to schedule break notifications",
        variant: "destructive",
      });
    }
  }, [userId, notificationsEnabled, toast]);

  const markBreakTaken = useCallback(async (breakTitle: string, scheduledTime: Date) => {
    if (!userId) return;

    try {
      await supabase
        .from("break_adherence")
        .update({
          taken: true,
          taken_at: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("break_title", breakTitle)
        .eq("scheduled_time", scheduledTime.toISOString());
    } catch (error) {
      console.error("Error marking break as taken:", error);
    }
  }, [userId]);

  return {
    notificationsEnabled,
    scheduleBreakNotifications,
    markBreakTaken,
    checkPermissions
  };
};