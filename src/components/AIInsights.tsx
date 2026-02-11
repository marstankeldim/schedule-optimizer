import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, TrendingUp, Lightbulb, Clock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FlowPrediction {
  timeRange: string;
  day: string;
  confidence: string;
  reasoning: string;
  recommendation: string;
}

interface ProductivityInsight {
  type: string;
  title: string;
  description: string;
  impact: string;
  suggestion: string;
}

interface SmartRecommendation {
  category: "time_management" | "energy_optimization" | "break_scheduling";
  title: string;
  description: string;
  priority: string;
  actionable: boolean;
}

interface AIInsightsProps {
  userId: string;
}

export const AIInsights = ({ userId }: AIInsightsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [flowPredictions, setFlowPredictions] = useState<FlowPrediction[]>([]);
  const [insights, setInsights] = useState<ProductivityInsight[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchAnalytics = async (type: string, setState: (data: any[]) => void) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-analytics', {
        body: { type },
      });

      if (error) throw error;

      if (type === 'flow_predictions') {
        setState(data.predictions || []);
      } else if (type === 'productivity_insights') {
        setState(data.insights || []);
      } else if (type === 'smart_recommendations') {
        setState(data.recommendations || []);
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      toast({
        title: "Error",
        description: `Failed to fetch ${type.replace('_', ' ')}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load all analytics on mount
    fetchAnalytics('flow_predictions', setFlowPredictions);
    fetchAnalytics('productivity_insights', setInsights);
    fetchAnalytics('smart_recommendations', setRecommendations);
    loadAppliedRecommendations();
  }, [userId]);

  const loadAppliedRecommendations = async () => {
    try {
      const { data } = await supabase
        .from('recommendation_applications')
        .select('recommendation_title')
        .eq('user_id', userId);
      
      if (data) {
        setAppliedRecommendations(new Set(data.map(r => r.recommendation_title)));
      }
    } catch (error) {
      console.error('Error loading applied recommendations:', error);
    }
  };

  const handleApplyRecommendation = async (rec: SmartRecommendation) => {
    try {
      const { error } = await supabase
        .from('recommendation_applications')
        .insert({
          user_id: userId,
          recommendation_title: rec.title,
          recommendation_category: rec.category,
        });

      if (error) throw error;

      setAppliedRecommendations(prev => new Set([...prev, rec.title]));
      toast({
        title: "Recommendation Applied",
        description: `"${rec.title}" has been tracked. Keep it up!`,
      });
    } catch (error) {
      console.error('Error applying recommendation:', error);
      toast({
        title: "Error",
        description: "Failed to track recommendation",
        variant: "destructive",
      });
    }
  };

  const filteredRecommendations = categoryFilter === "all"
    ? recommendations
    : recommendations.filter(r => r.category === categoryFilter);

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case "high":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "medium":
        return "bg-accent/20 text-accent-foreground border-accent/30";
      case "low":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">AI Analytics</h2>
            <p className="text-sm text-muted-foreground">Powered by AI insights</p>
          </div>
        </div>
        <Button
          onClick={() => {
            fetchAnalytics('flow_predictions', setFlowPredictions);
            fetchAnalytics('productivity_insights', setInsights);
            fetchAnalytics('smart_recommendations', setRecommendations);
          }}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      <Tabs defaultValue="predictions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="predictions">
            <Clock className="w-4 h-4 mr-2" />
            Flow
          </TabsTrigger>
          <TabsTrigger value="insights">
            <TrendingUp className="w-4 h-4 mr-2" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Lightbulb className="w-4 h-4 mr-2" />
            Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predictions" className="mt-6 space-y-4">
          {flowPredictions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Complete more tasks to get flow state predictions</p>
            </div>
          ) : (
            flowPredictions.map((prediction, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{prediction.timeRange}</h3>
                    <p className="text-sm text-muted-foreground">{prediction.day}</p>
                  </div>
                  <Badge className="bg-primary/20 text-primary">
                    {prediction.confidence} Confidence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{prediction.reasoning}</p>
                <div className="p-3 bg-primary/5 rounded border border-primary/20">
                  <p className="text-sm font-medium text-foreground">{prediction.recommendation}</p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="insights" className="mt-6 space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Not enough data to generate insights yet</p>
            </div>
          ) : (
            insights.map((insight, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground">{insight.title}</h3>
                  <Badge variant="outline" className={getImpactColor(insight.impact)}>
                    {insight.impact} Impact
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                <div className="p-3 bg-accent/5 rounded border border-accent/20">
                  <p className="text-sm text-foreground"><strong>Suggestion:</strong> {insight.suggestion}</p>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6 space-y-4">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant={categoryFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("all")}
            >
              All
            </Button>
            <Button
              variant={categoryFilter === "time_management" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("time_management")}
            >
              Time Management
            </Button>
            <Button
              variant={categoryFilter === "energy_optimization" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("energy_optimization")}
            >
              Energy Optimization
            </Button>
            <Button
              variant={categoryFilter === "break_scheduling" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter("break_scheduling")}
            >
              Break Scheduling
            </Button>
          </div>

          {filteredRecommendations.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No recommendations available in this category</p>
            </div>
          ) : (
            filteredRecommendations.map((rec, idx) => (
              <div key={idx} className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{rec.title}</h3>
                      {appliedRecommendations.has(rec.title) && (
                        <Badge variant="outline" className="bg-primary/10 text-primary text-xs">
                          Applied
                        </Badge>
                      )}
                    </div>
                    <Badge variant={getPriorityColor(rec.priority)} className="mb-2">
                      {rec.priority} priority
                    </Badge>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {rec.category.replace('_', ' ')}
                    </Badge>
                  </div>
                  {rec.actionable && (
                    <Badge variant="outline" className="bg-accent/10 text-accent">
                      Actionable
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{rec.description}</p>
                {rec.actionable && !appliedRecommendations.has(rec.title) && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={() => handleApplyRecommendation(rec)}
                    >
                      Apply Now
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
