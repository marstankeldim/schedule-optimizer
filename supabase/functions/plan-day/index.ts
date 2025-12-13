import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, startTime } = await req.json();
    console.log('Planning day for user:', userId, 'starting from:', startTime || '09:00');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch user's task history
    const { data: completedTasks, error: tasksError } = await supabase
      .from('completed_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(50);

    if (tasksError) throw tasksError;

    // Fetch user preferences
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Fetch recurring tasks
    const { data: recurringTasks } = await supabase
      .from('recurring_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    const startHour = startTime ? parseInt(startTime.split(':')[0]) : 9;
    const remainingHours = Math.max(1, 22 - startHour); // Until 10 PM
    
    const systemPrompt = `You are an AI day planner. Based on the user's task history and preferences, generate a list of tasks for the rest of today starting from ${startTime || '09:00'}.
    
    IMPORTANT: The user is planning from ${startTime || '09:00'} onwards. They have approximately ${remainingHours} hours left in their workday (until ~10 PM).
    
    Analyze:
    - Common tasks from history
    - Typical energy levels
    - Usual priorities
    - Recurring patterns
    
    Generate 3-6 tasks (fewer if starting late) that:
    - Fit within the remaining ${remainingHours} hours
    - Match their typical workload
    - Balance energy levels for remaining day
    - Are realistic and achievable for the time remaining
    - Prioritize high-priority items if time is limited`;


    const userPrompt = `Task History (last 50 completed tasks):
${completedTasks?.map(t => `- ${t.task_title} (${t.energy_level} energy, ${t.priority} priority, ${t.task_duration}min)`).join('\n')}

${recurringTasks?.length ? `Recurring Tasks:
${recurringTasks.map(t => `- ${t.title} (${t.energy_level} energy, ${t.priority} priority, ${t.duration}min)`).join('\n')}` : ''}

User Preferences:
- Max hours per day: ${preferences?.max_hours_per_day || 8}
- Preferred deep work days: ${preferences?.preferred_deep_work_days?.join(', ') || 'Not set'}

Current Time: ${startTime || '09:00'}
Hours Remaining: ~${remainingHours} hours until 10 PM

Generate a well-balanced task list for the rest of today, considering the limited time remaining.`;

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY not configured');

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
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_daily_tasks',
            description: 'Generate a list of tasks for the day',
            parameters: {
              type: 'object',
              properties: {
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      duration: { type: 'number', description: 'Duration in minutes' },
                      energyLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
                      priority: { type: 'string', enum: ['low', 'medium', 'high'] }
                    },
                    required: ['title', 'duration', 'energyLevel', 'priority'],
                    additionalProperties: false
                  }
                }
              },
              required: ['tasks'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_daily_tasks' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in plan-day function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
