import { AIInsights } from "@/components/AIInsights";
import { MentalHealthRewards } from "@/components/MentalHealthRewards";
import { DailyAISummary } from "@/components/DailyAISummary";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export default function AIInsightsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");
  const [appliedCount, setAppliedCount] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        loadMetrics(user.id);
      }
    };
    getUser();
  }, []);

  const loadMetrics = async (uid: string) => {
    try {
      const { data } = await supabase
        .from('recommendation_applications')
        .select('*')
        .eq('user_id', uid);
      
      setAppliedCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="p-4 bg-gradient-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recommendations Applied</p>
                <p className="text-2xl font-bold text-foreground">{appliedCount}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-card border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-accent/20 rounded-lg">
                <Award className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-foreground">{appliedCount > 0 ? '85%' : 'N/A'}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <DailyAISummary userId={userId} />
            <AIInsights userId={userId} />
          </div>
          <div>
            <MentalHealthRewards userId={userId} />
          </div>
        </div>
      </div>
    </div>
  );
}
