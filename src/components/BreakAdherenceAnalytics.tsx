import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Droplets, Utensils, Coffee, TrendingUp, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BreakAdherenceAnalyticsProps {
  userId: string;
}

interface BreakStats {
  total: number;
  taken: number;
  adherenceRate: number;
}

interface BreakTypeStats {
  meal: BreakStats;
  hydration: BreakStats;
  regular: BreakStats;
}

export const BreakAdherenceAnalytics = ({ userId }: BreakAdherenceAnalyticsProps) => {
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");
  const [stats, setStats] = useState<BreakTypeStats>({
    meal: { total: 0, taken: 0, adherenceRate: 0 },
    hydration: { total: 0, taken: 0, adherenceRate: 0 },
    regular: { total: 0, taken: 0, adherenceRate: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId, timeRange]);

  const loadStats = async () => {
    setLoading(true);
    const daysAgo = timeRange === "week" ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const { data, error } = await supabase
      .from("break_adherence")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString().split('T')[0]);

    if (error) {
      console.error("Error loading break adherence:", error);
      setLoading(false);
      return;
    }

    const typeStats: BreakTypeStats = {
      meal: { total: 0, taken: 0, adherenceRate: 0 },
      hydration: { total: 0, taken: 0, adherenceRate: 0 },
      regular: { total: 0, taken: 0, adherenceRate: 0 },
    };

    data.forEach((record) => {
      const type = record.break_type as keyof BreakTypeStats;
      if (typeStats[type]) {
        typeStats[type].total++;
        if (record.taken) typeStats[type].taken++;
      }
    });

    // Calculate adherence rates
    Object.keys(typeStats).forEach((key) => {
      const type = key as keyof BreakTypeStats;
      if (typeStats[type].total > 0) {
        typeStats[type].adherenceRate = 
          Math.round((typeStats[type].taken / typeStats[type].total) * 100);
      }
    });

    setStats(typeStats);
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "meal":
        return <Utensils className="w-5 h-5 text-primary" />;
      case "hydration":
        return <Droplets className="w-5 h-5 text-accent" />;
      default:
        return <Coffee className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case "meal":
        return "Meal Breaks";
      case "hydration":
        return "Hydration Breaks";
      default:
        return "Regular Breaks";
    }
  };

  const getMostConsistentBreakType = () => {
    const entries = Object.entries(stats) as [keyof BreakTypeStats, BreakStats][];
    const withData = entries.filter(([, s]) => s.total > 0);
    if (withData.length === 0) return null;
    withData.sort((a, b) => b[1].adherenceRate - a[1].adherenceRate);
    return withData[0][0];
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Break Adherence
        </h3>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as "week" | "month")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const type = getMostConsistentBreakType();
            if (!type) return null;
            return (
              <div className="p-3 rounded-lg bg-secondary/60 border border-border/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Most consistent break type</span>
                </div>
                <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>{getLabel(type)}</span>
                  <span className="text-primary">
                    {stats[type].adherenceRate}%
                  </span>
                </div>
              </div>
            );
          })()}

          {(Object.keys(stats) as Array<keyof BreakTypeStats>).map((type) => (
            <div key={type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(type)}
                  <span className="font-medium text-foreground">{getLabel(type)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {stats[type].taken} / {stats[type].total}
                </span>
              </div>
              <Progress value={stats[type].adherenceRate} className="h-2" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Adherence Rate</span>
                <span
                  className={`font-semibold ${
                    stats[type].adherenceRate >= 80
                      ? "text-primary"
                      : stats[type].adherenceRate >= 50
                      ? "text-accent"
                      : "text-destructive"
                  }`}
                >
                  {stats[type].adherenceRate}%
                </span>
              </div>
            </div>
          ))}

          {stats.meal.total === 0 && stats.hydration.total === 0 && stats.regular.total === 0 && (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                No break data yet. Complete your optimized schedule to track adherence!
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};