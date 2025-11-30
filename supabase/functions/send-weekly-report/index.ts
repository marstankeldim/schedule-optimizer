import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, reportData } = await req.json();

    if (!email || !reportData) {
      return new Response(
        JSON.stringify({ error: 'Email and reportData are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { weekStart, weekEnd, summary, topRecommendations, improvements, stats } = reportData;

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-box { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .stat-box h3 { margin: 0; font-size: 32px; color: #667eea; }
            .stat-box p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
            .section { margin: 25px 0; }
            .section h2 { color: #667eea; font-size: 20px; margin-bottom: 10px; }
            .list-item { background: white; padding: 12px; margin: 8px 0; border-radius: 6px; border-left: 4px solid #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Your Weekly Productivity Report</h1>
            <p>${weekStart} to ${weekEnd}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h2>📈 This Week's Summary</h2>
              <p>${summary}</p>
            </div>

            <div class="stats">
              <div class="stat-box">
                <h3>${stats.tasksCompleted}</h3>
                <p>Tasks Completed</p>
              </div>
              <div class="stat-box">
                <h3>${stats.goalsAchieved}</h3>
                <p>Goals Achieved</p>
              </div>
            </div>

            <div class="section">
              <h2>⭐ Most Successful Recommendations</h2>
              ${topRecommendations.map(rec => `<div class="list-item">${rec}</div>`).join('')}
            </div>

            <div class="section">
              <h2>🎯 Improvement Suggestions for Next Week</h2>
              ${improvements.map(imp => `<div class="list-item">${imp}</div>`).join('')}
            </div>

            <div class="footer">
              <p>Keep up the great work! 🚀</p>
              <p>This is an automated report from your Schedule Optimizer</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Schedule Optimizer <onboarding@resend.dev>',
        to: [email],
        subject: `📊 Your Weekly Productivity Report - ${weekStart} to ${weekEnd}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      throw new Error(`Resend API error: ${error}`);
    }

    const result = await emailResponse.json();
    console.log('Email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending weekly report email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});