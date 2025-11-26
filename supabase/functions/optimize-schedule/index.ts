import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tasks } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Optimizing schedule for tasks:", tasks);

    const systemPrompt = `You are an expert schedule optimizer. Given a list of tasks with their duration, energy level requirements, and priority, create an optimized daily schedule starting at 9:00 AM.

Optimization rules:
1. High-energy tasks should be scheduled during peak productivity hours (9 AM - 12 PM, 2 PM - 4 PM)
2. Low-energy tasks should be scheduled during low-energy periods (after lunch, late afternoon)
3. High-priority tasks should be scheduled first within their energy level group
4. Minimize gaps between tasks for time efficiency
5. Include a lunch break around 12:30 PM - 1:30 PM if the schedule extends that long

Return ONLY a valid JSON object with this exact structure (no additional text):
{
  "schedule": [
    {
      "id": "task-id",
      "title": "task title",
      "duration": 60,
      "energyLevel": "high",
      "priority": "high",
      "startTime": "09:00",
      "endTime": "10:00"
    }
  ]
}`;

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
    const aiResponse = data.choices[0].message.content;
    console.log("AI response:", aiResponse);

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
