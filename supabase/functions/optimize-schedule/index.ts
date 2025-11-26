import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Task {
  id: string;
  title: string;
  duration: number;
  energyLevel: "high" | "medium" | "low";
  priority: "high" | "medium" | "low";
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
}

// Helper function to calculate time
const addMinutesToTime = (time: string, minutes: number): string => {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tasks, startTime = "09:00", breakPreference = "auto", userId, planningPeriod = "tomorrow", workdays } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    console.log("Optimizing schedule for tasks:", tasks);
    console.log("Start time:", startTime);
    console.log("Break preference:", breakPreference);
    console.log("Planning period:", planningPeriod);
    console.log("User ID:", userId);

    // Fetch calendar events for the user if userId is provided
    let calendarEvents: CalendarEvent[] = [];
    if (userId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      // Get date range based on planning period
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      
      if (planningPeriod === "week") {
        // Get events for the next 7 days
        endDate.setDate(endDate.getDate() + 7);
      } else {
        // Get events for tomorrow only
        endDate.setHours(23, 59, 59, 999);
      }

      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("user_id", userId)
        .gte("start_time", today.toISOString())
        .lte("start_time", endDate.toISOString())
        .order("start_time", { ascending: true });

      if (!error && data) {
        calendarEvents = data;
        console.log(`Found ${calendarEvents.length} calendar events for ${planningPeriod}`);
      }
    }

    let breakInstructions = "";
    switch (breakPreference) {
      case "none":
        breakInstructions = "Do NOT include any breaks between tasks.";
        break;
      case "short":
        breakInstructions = "Include short 5-10 minute breaks between tasks, especially after high-energy tasks.";
        break;
      case "long":
        breakInstructions = "Include longer 30+ minute breaks between major task blocks to prevent burnout.";
        break;
      case "auto":
        breakInstructions = "Intelligently add breaks based on task energy levels: 5-10 min after high-energy tasks, 15-20 min after multiple consecutive tasks, and a longer lunch break if the schedule extends beyond 4 hours.";
        break;
    }

    // Build calendar events description for the prompt
    let calendarEventsInfo = "";
    if (calendarEvents.length > 0) {
      calendarEventsInfo = "\n\nIMPORTANT: The user has existing calendar commitments today that you MUST work around. These time slots are UNAVAILABLE and tasks must be scheduled only in the FREE time slots:\n\n";
      calendarEventsInfo += "Busy time slots (DO NOT schedule tasks during these times):\n";
      
      calendarEvents.forEach((event) => {
        const startDate = new Date(event.start_time);
        const endDate = new Date(event.end_time);
        const startTimeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        calendarEventsInfo += `- ${startTimeStr} to ${endTimeStr}: ${event.title}\n`;
      });
      
      calendarEventsInfo += "\nYou MUST schedule tasks only in the time slots that are FREE (not listed above). Find gaps between calendar events and use those for task scheduling.";
    }

    let systemPrompt = "";
    let responseFormat = "";

    if (planningPeriod === "week") {
      // Weekly planning prompt
      const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const selectedWorkdays = workdays && workdays.length > 0 ? workdays : daysOfWeek;

      responseFormat = `{
  "weeklySchedule": {
    "Monday": [/* array of tasks with startTime, endTime, etc. */],
    "Tuesday": [/* array of tasks */],
    "Wednesday": [/* array of tasks */],
    "Thursday": [/* array of tasks */],
    "Friday": [/* array of tasks */],
    "Saturday": [/* array of tasks */],
    "Sunday": [/* array of tasks */]
  }
}`;

      systemPrompt = `You are an expert weekly schedule optimizer. Given a list of tasks, distribute them intelligently across the selected workdays of the week, starting each day at ${startTime}.

IMPORTANT: The user has selected these workdays: ${selectedWorkdays.join(", ")}. Do NOT schedule ANY tasks on non-workdays. Non-workdays should have empty arrays.

${calendarEventsInfo}

Weekly optimization rules:
1. ONLY schedule tasks on these days: ${selectedWorkdays.join(", ")}
2. For non-workdays (not in the list above), return an empty array []
3. Distribute tasks evenly across the selected workdays to prevent burnout
4. Schedule high-priority tasks early in the week if Monday-Wednesday are workdays
5. Schedule high-energy tasks during morning hours (9am-12pm) on each workday
6. Lighter tasks and low-energy work for later in the week
7. Balance daily workload - aim for 4-6 hours of focused work per workday
8. ${breakInstructions}
9. Each workday should start at ${startTime}
10. ${calendarEvents.length > 0 ? "CRITICAL: Work around existing calendar events. Do NOT schedule tasks during busy times." : ""}

IMPORTANT: For breaks, add them as separate items with "isBreak": true. Each day's tasks should be in chronological order with proper start and end times.

Return ONLY a valid JSON object with this exact structure (no additional text):
${responseFormat}`;
    } else {
      // Daily planning prompt (tomorrow)
      responseFormat = `{
  "schedule": [
    {
      "id": "task-id",
      "title": "task title",
      "duration": 60,
      "energyLevel": "high",
      "priority": "high",
      "startTime": "09:00",
      "endTime": "10:00",
      "isBreak": false
    }
  ]
}`;

      systemPrompt = `You are an expert schedule optimizer. Given a list of tasks with their duration, energy level requirements, and priority, create an optimized daily schedule starting at ${startTime}.

${calendarEventsInfo}

Optimization rules:
1. ${calendarEvents.length > 0 ? "CRITICAL: Schedule tasks ONLY in free time slots. Do NOT overlap with calendar events listed above." : "Optimize the entire day starting from the start time."}
2. High-energy tasks should be scheduled during peak productivity hours (morning and early afternoon)
3. Low-energy tasks should be scheduled during low-energy periods (after lunch, late afternoon)
4. High-priority tasks should be scheduled first within their energy level group
5. Minimize gaps between tasks for time efficiency
6. ${breakInstructions}
7. ${calendarEvents.length > 0 ? "If a task won't fit before the next calendar event, move it to after that event." : ""}

IMPORTANT: For breaks, add them as separate items in the schedule array with "isBreak": true. Break titles should describe the break (e.g., "Short Break", "Coffee Break", "Lunch Break", "Rest Period").

Return ONLY a valid JSON object with this exact structure (no additional text):
${responseFormat}`;
    }

    const userPrompt = `Optimize the following tasks into a schedule:\n${JSON.stringify(tasks, null, 2)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;
    console.log("AI response:", aiResponse);

    // Strip markdown code blocks if present
    aiResponse = aiResponse.trim();
    if (aiResponse.startsWith("```json")) {
      aiResponse = aiResponse.slice(7); // Remove ```json
    } else if (aiResponse.startsWith("```")) {
      aiResponse = aiResponse.slice(3); // Remove ```
    }
    if (aiResponse.endsWith("```")) {
      aiResponse = aiResponse.slice(0, -3); // Remove trailing ```
    }
    aiResponse = aiResponse.trim();

    // Parse the AI response
    const scheduleData = JSON.parse(aiResponse);

    return new Response(JSON.stringify(scheduleData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in optimize-schedule function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});