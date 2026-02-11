import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const allowedTypes = new Set([
  'flow_predictions',
  'productivity_insights',
  'smart_recommendations',
  'daily_summary',
] as const);

type AnalyticsType = 'flow_predictions' | 'productivity_insights' | 'smart_recommendations' | 'daily_summary';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const toString = (value: unknown) => (typeof value === 'string' ? value : '');
const toBoolean = (value: unknown) => value === true;
const cleanAiText = (value: unknown) =>
  toString(value)
    .replace(/\b(?:null|undefined)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

const parseJsonFromAiContent = (content: string): unknown => {
  const codeFenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = codeFenceMatch ? codeFenceMatch[1] : content;

  try {
    return JSON.parse(candidate);
  } catch (_) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error('Failed to parse AI response as JSON');
  }
};

const normalizeResult = (type: AnalyticsType, payload: unknown) => {
  const safePayload = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {};

  if (type === 'flow_predictions') {
    const predictions = Array.isArray(safePayload.predictions) ? safePayload.predictions : [];
    return {
      predictions: predictions.slice(0, 5).map((item) => {
        const row = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
        return {
          timeRange: toString(row.timeRange),
          day: toString(row.day),
          confidence: toString(row.confidence),
          reasoning: toString(row.reasoning),
          recommendation: toString(row.recommendation),
        };
      }).filter((p) => p.timeRange || p.reasoning || p.recommendation),
    };
  }

  if (type === 'productivity_insights') {
    const insights = Array.isArray(safePayload.insights) ? safePayload.insights : [];
    return {
      insights: insights.slice(0, 8).map((item) => {
        const row = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
        return {
          type: toString(row.type),
          title: toString(row.title),
          description: toString(row.description),
          impact: toString(row.impact),
          suggestion: toString(row.suggestion),
        };
      }).filter((i) => i.title || i.description || i.suggestion),
    };
  }

  if (type === 'smart_recommendations') {
    const recommendations = Array.isArray(safePayload.recommendations) ? safePayload.recommendations : [];
    return {
      recommendations: recommendations.slice(0, 10).map((item) => {
        const row = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
        const category = toString(row.category);
        const normalizedCategory =
          category === 'time_management' || category === 'energy_optimization' || category === 'break_scheduling'
            ? category
            : 'time_management';
        return {
          category: normalizedCategory,
          title: toString(row.title),
          description: toString(row.description),
          priority: toString(row.priority) || 'medium',
          actionable: toBoolean(row.actionable),
        };
      }).filter((r) => r.title || r.description),
    };
  }

  const summary = typeof safePayload.summary === 'object' && safePayload.summary !== null
    ? safePayload.summary as Record<string, unknown>
    : {};

  return {
    summary: {
      topPriorities: Array.isArray(summary.topPriorities)
        ? summary.topPriorities.slice(0, 5).map((item) => cleanAiText(item)).filter(Boolean)
        : [],
      energyPattern: cleanAiText(summary.energyPattern),
      keyRecommendation: cleanAiText(summary.keyRecommendation),
      workloadEstimate: cleanAiText(summary.workloadEstimate) ||
        'Estimate 4-5 hours of focused work on task definition and prioritization, plus buffer for unexpected items.',
    },
  };
};

const callLovableWithRetry = async (
  lovableApiKey: string,
  systemPrompt: string,
  userPrompt: string,
) => {
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          temperature: 0.2,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const status = response.status;
        const errorText = await response.text();
        if (attempt < maxAttempts && (status === 429 || status >= 500)) {
          await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
          continue;
        }
        throw new Error(`AI API error: ${status} ${errorText.slice(0, 200)}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
        continue;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AI API timeout');
      }
      throw error;
    }
  }

  throw new Error('AI API request failed');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json().catch(() => null);
    const type = requestBody?.type;
    const requestedUserId = requestBody?.userId;

    if (!allowedTypes.has(type)) {
      return new Response(JSON.stringify({ error: 'Invalid analytics type' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !lovableApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const authUserId = authData.user.id;
    if (requestedUserId && requestedUserId !== authUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden: user mismatch' }), {
        status: 403,
        headers: jsonHeaders,
      });
    }

    // Fetch user data for analysis
    const [completedTasks, flowSessions, tasks, recurringTasks] = await Promise.all([
      supabase
        .from('completed_tasks')
        .select('completed_at,energy_level,priority,task_duration,task_title')
        .eq('user_id', authUserId)
        .order('completed_at', { ascending: false })
        .limit(50),
      supabase
        .from('flow_state_sessions')
        .select('start_time,end_time,average_energy_level,quality_score,interruptions,tasks_completed')
        .eq('user_id', authUserId)
        .order('start_time', { ascending: false })
        .limit(30),
      supabase
        .from('tasks')
        .select('title,duration,energy_level,priority,preferred_time,created_at')
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('recurring_tasks')
        .select('title,duration,energy_level,priority,preferred_time,is_active,recurrence_type,start_date,end_date')
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    const queryErrors = [completedTasks.error, flowSessions.error, tasks.error, recurringTasks.error].filter(Boolean);
    if (queryErrors.length > 0) {
      throw new Error(`Failed to fetch analytics data: ${queryErrors[0]?.message}`);
    }

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

    const aiData = await callLovableWithRetry(lovableApiKey, systemPrompt, userPrompt);
    const content = aiData?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('AI API returned empty response');
    }
    const rawResult = parseJsonFromAiContent(content);
    const result = normalizeResult(type as AnalyticsType, rawResult);

    return new Response(JSON.stringify(result), {
      headers: { ...jsonHeaders, 'Cache-Control': 'no-store' },
    });

  } catch (error) {
    console.error('Error in ai-analytics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
