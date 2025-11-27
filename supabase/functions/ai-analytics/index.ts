import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, userId } = await req.json();
    console.log('AI Analytics request:', { type, userId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user data for analysis
    const [completedTasks, flowSessions, tasks, recurringTasks] = await Promise.all([
      supabase.from('completed_tasks').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(50),
      supabase.from('flow_state_sessions').select('*').eq('user_id', userId).order('start_time', { ascending: false }).limit(30),
      supabase.from('tasks').select('*').eq('user_id', userId),
      supabase.from('recurring_tasks').select('*').eq('user_id', userId),
    ]);

    console.log('Fetched data:', {
      completedTasks: completedTasks.data?.length,
      flowSessions: flowSessions.data?.length,
      tasks: tasks.data?.length,
      recurringTasks: recurringTasks.data?.length,
    });

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'flow_predictions') {
      systemPrompt = `You are an AI productivity analyst. Analyze the user's task completion patterns and flow state data to predict optimal times for deep work.
      
      Return ONLY a JSON object with this structure:
      {
        "predictions": [
          {
            "timeRange": "9:00 AM - 11:30 AM",
            "day": "Weekdays",
            "confidence": "High",
            "reasoning": "Your most productive deep work sessions historically occur in the morning",
            "recommendation": "Schedule high-energy, high-priority tasks during this window"
          }
        ]
      }`;

      userPrompt = `Analyze this user's productivity data and predict their optimal times for deep work:
      
      Completed Tasks (last 50): ${JSON.stringify(completedTasks.data?.slice(0, 10))}
      Flow State Sessions (last 30): ${JSON.stringify(flowSessions.data)}
      
      Provide 2-3 time range predictions for when they should do deep work.`;

    } else if (type === 'productivity_insights') {
      systemPrompt = `You are an AI productivity analyst. Analyze patterns and provide actionable insights.
      
      Return ONLY a JSON object with this structure:
      {
        "insights": [
          {
            "type": "pattern",
            "title": "Morning Productivity Peak",
            "description": "You complete 60% of your high-energy tasks before noon",
            "impact": "high",
            "suggestion": "Continue prioritizing important work in the morning"
          }
        ]
      }`;

      userPrompt = `Analyze this productivity data and provide 3-5 key insights:
      
      Completed Tasks: ${JSON.stringify(completedTasks.data?.slice(0, 20))}
      Flow Sessions: ${JSON.stringify(flowSessions.data)}
      Current Tasks: ${JSON.stringify(tasks.data?.slice(0, 10))}
      
      Focus on patterns, efficiency, and areas for improvement.`;

    } else if (type === 'smart_recommendations') {
      systemPrompt = `You are an AI scheduling assistant. Provide smart recommendations for tasks and schedule optimization.
      
      Categorize recommendations into: "time_management", "energy_optimization", or "break_scheduling".
      
      Return ONLY a JSON object with this structure:
      {
        "recommendations": [
          {
            "category": "time_management",
            "title": "Add stretching breaks",
            "description": "Consider adding 5-minute stretching sessions between long focus blocks",
            "priority": "medium",
            "actionable": true
          }
        ]
      }`;

      userPrompt = `Provide smart recommendations based on this data:
      
      Current Tasks: ${JSON.stringify(tasks.data)}
      Recurring Tasks: ${JSON.stringify(recurringTasks.data)}
      Recent Completed Tasks: ${JSON.stringify(completedTasks.data?.slice(0, 15))}
      
      Provide 5-8 recommendations across all three categories: time_management, energy_optimization, and break_scheduling.`;
    } else if (type === 'daily_summary') {
      systemPrompt = `You are an AI productivity coach. Generate a concise daily summary with priorities and recommendations.
      
      Return ONLY a JSON object with this structure:
      {
        "summary": {
          "topPriorities": ["Task 1", "Task 2", "Task 3"],
          "energyPattern": "Your energy peaks in the morning hours",
          "keyRecommendation": "Focus on high-priority tasks before lunch",
          "workloadEstimate": "6-7 hours of focused work"
        }
      }`;

      userPrompt = `Generate a daily summary based on:
      
      Current Tasks: ${JSON.stringify(tasks.data)}
      Recent Patterns: ${JSON.stringify(completedTasks.data?.slice(0, 10))}
      
      Provide actionable insights for today.`;
    }

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    console.log('AI response:', content);

    // Extract JSON from markdown code blocks if present
    let jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    let result;
    
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[1]);
    } else {
      result = JSON.parse(content);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
