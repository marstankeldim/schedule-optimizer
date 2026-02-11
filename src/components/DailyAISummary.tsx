import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, AlertCircle, Zap, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DailySummary {
  topPriorities: string[];
  energyPattern: string;
  keyRecommendation: string;
  workloadEstimate: string;
}

interface DailyAISummaryProps {
  userId: string;
}

export const DailyAISummary = ({ userId }: DailyAISummaryProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const { toast } = useToast();

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-analytics', {
        body: { type: 'daily_summary' },
      });

      if (error) throw error;
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      toast({
        title: "Error",
        description: "Failed to fetch daily summary",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [userId]);

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-card border-border shadow-card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="p-6 bg-gradient-card border-border shadow-card">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No summary available yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Today's AI Summary</h2>
            <p className="text-sm text-muted-foreground">Your personalized daily insights</p>
          </div>
        </div>
        <Button
          onClick={fetchSummary}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Top Priorities */}
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Top Priorities</h3>
          </div>
          <div className="space-y-2">
            {summary.topPriorities.map((priority, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {idx + 1}
                </Badge>
                <span className="text-sm text-foreground">{priority}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Energy Pattern */}
        <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-accent" />
            <h3 className="font-semibold text-foreground">Energy Pattern</h3>
          </div>
          <p className="text-sm text-muted-foreground">{summary.energyPattern}</p>
        </div>

        {/* Key Recommendation */}
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-foreground" />
            <h3 className="font-semibold text-foreground">Key Recommendation</h3>
          </div>
          <p className="text-sm text-foreground font-medium">{summary.keyRecommendation}</p>
        </div>

        {/* Workload Estimate */}
        <div className="p-3 bg-muted/20 rounded-lg text-center">
          <p className="text-xs text-muted-foreground">Estimated Workload</p>
          <p className="text-lg font-semibold text-foreground mt-1">{summary.workloadEstimate}</p>
        </div>
      </div>
    </Card>
  );
};
