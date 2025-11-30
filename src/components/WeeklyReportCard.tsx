import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Target, Lightbulb, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  productivity_summary: {
    tasksCompleted: number;
    recommendationsApplied: number;
    goalsAchieved: number;
    breakAdherence: string;
    summary: string;
  };
  top_recommendations: string[];
  improvement_suggestions: string[];
  created_at: string;
}

interface WeeklyReportCardProps {
  userId: string;
}

export const WeeklyReportCard = ({ userId }: WeeklyReportCardProps) => {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLatestReport();
  }, [userId]);

  const loadLatestReport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('user_id', userId)
        .order('week_start', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setReport({
          ...data,
          productivity_summary: data.productivity_summary as WeeklyReport['productivity_summary']
        });
      }
    } catch (error) {
      console.error('Error loading weekly report:', error);
      toast({
        title: "Error",
        description: "Failed to load weekly report",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-card border-border">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="p-6 bg-gradient-card border-border">
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Weekly Report Yet</h3>
          <p className="text-sm text-muted-foreground">
            Your first weekly report will be generated at the end of the week
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Weekly Report</h2>
            <p className="text-sm text-muted-foreground">
              {new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary">
          Latest
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-primary">{report.productivity_summary.tasksCompleted}</p>
          <p className="text-sm text-muted-foreground mt-1">Tasks Completed</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-primary">{report.productivity_summary.goalsAchieved}</p>
          <p className="text-sm text-muted-foreground mt-1">Goals Achieved</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-primary">{report.productivity_summary.recommendationsApplied}</p>
          <p className="text-sm text-muted-foreground mt-1">Recommendations</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-primary">{report.productivity_summary.breakAdherence}%</p>
          <p className="text-sm text-muted-foreground mt-1">Break Adherence</p>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Weekly Summary
        </h3>
        <p className="text-sm text-muted-foreground">{report.productivity_summary.summary}</p>
      </div>

      {/* Top Recommendations */}
      <div className="mb-6">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Most Successful Recommendations
        </h3>
        <div className="space-y-2">
          {report.top_recommendations.map((rec, idx) => (
            <div key={idx} className="p-3 bg-card border border-border rounded-lg text-sm text-foreground">
              {rec}
            </div>
          ))}
        </div>
      </div>

      {/* Improvement Suggestions */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-accent" />
          Suggestions for Next Week
        </h3>
        <div className="space-y-2">
          {report.improvement_suggestions.map((suggestion, idx) => (
            <div key={idx} className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-sm text-foreground">
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};