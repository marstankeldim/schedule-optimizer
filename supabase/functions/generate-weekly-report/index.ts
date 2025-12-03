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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all users to generate reports for
    const { data: users, error: usersError } = await supabaseClient.auth.admin.listUsers();
    
    if (usersError) throw usersError;

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const weekEnd = new Date(today);

    for (const user of users.users) {
      console.log(`Generating report for user ${user.id}`);
      
      // Fetch user data for the past week
      const [completedTasks, recommendations, goals, breaks] = await Promise.all([
        supabaseClient
          .from('completed_tasks')
          .select('*')
          .eq('user_id', user.id)
          .gte('completed_at', weekStart.toISOString())
          .lte('completed_at', weekEnd.toISOString()),
        supabaseClient
          .from('recommendation_applications')
          .select('*')
          .eq('user_id', user.id)
          .gte('applied_at', weekStart.toISOString())
          .lte('applied_at', weekEnd.toISOString()),
        supabaseClient
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .gte('week_start', weekStart.toISOString().split('T')[0]),
        supabaseClient
          .from('break_adherence')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', weekStart.toISOString().split('T')[0])
          .lte('date', weekEnd.toISOString().split('T')[0])
      ]);

      // Generate AI-powered insights
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

      const prompt = `Analyze this user's productivity data for the past week and generate a comprehensive weekly report:

Completed Tasks: ${completedTasks.data?.length || 0} tasks
- Average energy level: ${completedTasks.data?.length ? (completedTasks.data.reduce((sum, t) => sum + (t.energy_level === 'high' ? 3 : t.energy_level === 'medium' ? 2 : 1), 0) / completedTasks.data.length).toFixed(1) : 'N/A'}
- Most common priority: ${completedTasks.data?.length ? completedTasks.data.sort((a, b) => completedTasks.data!.filter(t => t.priority === b.priority).length - completedTasks.data!.filter(t => t.priority === a.priority).length)[0]?.priority : 'N/A'}

Applied Recommendations: ${recommendations.data?.length || 0}
- Categories: ${recommendations.data?.map(r => r.recommendation_category).join(', ') || 'None'}

Goals: ${goals.data?.length || 0}
- Achieved: ${goals.data?.filter(g => g.achieved).length || 0}

Break Adherence: ${breaks.data?.filter(b => b.taken).length || 0} of ${breaks.data?.length || 0} breaks taken

Generate:
1. A productivity summary (2-3 sentences highlighting key patterns and achievements)
2. Top 3 most successful recommendation categories that were applied
3. 3 personalized improvement suggestions for next week

Return as JSON: {"summary": "text", "topRecommendations": ["rec1", "rec2", "rec3"], "improvements": ["imp1", "imp2", "imp3"]}`;

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a productivity analytics expert. Always return valid JSON.' },
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error('AI gateway error:', await aiResponse.text());
        continue;
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;
      
      let reportData;
      try {
        reportData = JSON.parse(content);
      } catch (e) {
        console.error('Failed to parse AI response:', content);
        reportData = {
          summary: "Your productivity data for this week has been recorded.",
          topRecommendations: ["Continue tracking your tasks", "Maintain consistent work patterns", "Monitor your energy levels"],
          improvements: ["Set clearer goals for next week", "Try new productivity techniques", "Review your break schedule"]
        };
      }

      // Store the report
      const { error: insertError } = await supabaseClient
        .from('weekly_reports')
        .insert({
          user_id: user.id,
          week_start: weekStart.toISOString().split('T')[0],
          week_end: weekEnd.toISOString().split('T')[0],
          productivity_summary: {
            tasksCompleted: completedTasks.data?.length || 0,
            recommendationsApplied: recommendations.data?.length || 0,
            goalsAchieved: goals.data?.filter(g => g.achieved).length || 0,
            breakAdherence: breaks.data?.length ? ((breaks.data.filter(b => b.taken).length / breaks.data.length) * 100).toFixed(0) : '0',
            summary: reportData.summary
          },
          top_recommendations: reportData.topRecommendations || [],
          improvement_suggestions: reportData.improvements || []
        });

      if (insertError) {
        console.error('Error storing report:', insertError);
        continue;
      }

      // Trigger email sending (fire and forget)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-weekly-report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          reportData: {
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            summary: reportData.summary,
            topRecommendations: reportData.topRecommendations,
            improvements: reportData.improvements,
            stats: {
              tasksCompleted: completedTasks.data?.length || 0,
              goalsAchieved: goals.data?.filter(g => g.achieved).length || 0,
            }
          }
        })
      }).catch(err => console.error('Failed to send email:', err));

      console.log(`Report generated for user ${user.id}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Generated reports for ${users.users.length} users` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating weekly reports:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});