import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, TrendingUp, Clock, Zap, Coffee, Calendar, Trophy } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { BreakAdherenceAnalytics } from "@/components/BreakAdherenceAnalytics";
import { WeeklyReportCard } from "@/components/WeeklyReportCard";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CompletedTask {
  id: string;
  task_title: string;
  task_duration: number;
  energy_level: string;
  priority: string;
  completed_at: string;
}

interface GoalAchievement {
  id: string;
  goal_type: string;
  target_value: number;
  achieved_value: number;
  achieved_at: string;
}

const Dashboard = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<GoalAchievement[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        setTimeout(() => {
          loadData();
        }, 0);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadData = async () => {
    if (!session?.user) return;

    // Load completed tasks from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: tasksData } = await supabase
      .from("completed_tasks")
      .select("*")
      .eq("user_id", session.user.id)
      .gte("completed_at", thirtyDaysAgo.toISOString())
      .order("completed_at", { ascending: true });

    if (tasksData) {
      setCompletedTasks(tasksData);
    }

    // Load schedules to analyze break patterns
    const { data: schedulesData } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (schedulesData) {
      setSchedules(schedulesData);
    }

    // Load goal achievements
    const { data: achievementsData } = await supabase
      .from("goal_achievements")
      .select("*")
      .eq("user_id", session.user.id)
      .order("achieved_at", { ascending: false })
      .limit(5);

    if (achievementsData) {
      setAchievements(achievementsData);
    }
  };

  // Calculate weekly completion trend
  const getWeeklyTrend = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const count = completedTasks.filter(
        task => task.completed_at.split('T')[0] === date
      ).length;
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
      return { date: dayName, tasks: count };
    });
  };

  // Energy level distribution
  const getEnergyDistribution = () => {
    const distribution = { high: 0, medium: 0, low: 0 };
    completedTasks.forEach(task => {
      distribution[task.energy_level as keyof typeof distribution]++;
    });

    return [
      { name: 'High Energy', value: distribution.high, color: 'hsl(var(--energy-high))' },
      { name: 'Medium Energy', value: distribution.medium, color: 'hsl(var(--energy-medium))' },
      { name: 'Low Energy', value: distribution.low, color: 'hsl(var(--energy-low))' },
    ];
  };

  // Most productive hours
  const getProductiveHours = () => {
    const hourCounts: Record<number, number> = {};
    
    completedTasks.forEach(task => {
      const hour = new Date(task.completed_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({
        hour: `${hour}:00`,
        tasks: count,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  };

  // Break adherence from schedules
  const getBreakAdherence = () => {
    const breakStats = schedules.reduce((acc, schedule) => {
      const breaks = schedule.schedule_data.filter((item: any) => item.isBreak).length;
      const tasks = schedule.schedule_data.filter((item: any) => !item.isBreak).length;
      
      if (breaks > 0) acc.withBreaks++;
      else acc.withoutBreaks++;
      
      return acc;
    }, { withBreaks: 0, withoutBreaks: 0 });

    return [
      { name: 'With Breaks', value: breakStats.withBreaks, color: 'hsl(var(--energy-medium))' },
      { name: 'No Breaks', value: breakStats.withoutBreaks, color: 'hsl(var(--destructive))' },
    ];
  };

  // Calculate stats
  const totalCompleted = completedTasks.length;
  const avgDuration = completedTasks.length > 0
    ? Math.round(completedTasks.reduce((sum, task) => sum + task.task_duration, 0) / completedTasks.length)
    : 0;
  const totalSchedules = schedules.length;
  const avgBreaksPerSchedule = schedules.length > 0
    ? (schedules.reduce((sum, s) => sum + s.schedule_data.filter((i: any) => i.isBreak).length, 0) / schedules.length).toFixed(1)
    : 0;

  const weeklyTrend = getWeeklyTrend();
  const energyDistribution = getEnergyDistribution();
  const productiveHours = getProductiveHours();
  const breakAdherence = getBreakAdherence();

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="bg-secondary hover:bg-secondary/80 border-border"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-foreground">Productivity Dashboard</h1>
            <p className="text-muted-foreground">Your performance insights over the last 30 days</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tasks Completed</p>
                <p className="text-3xl font-bold text-foreground">{totalCompleted}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Task Duration</p>
                <p className="text-3xl font-bold text-foreground">{avgDuration}<span className="text-lg">min</span></p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Schedules Created</p>
                <p className="text-3xl font-bold text-foreground">{totalSchedules}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Coffee className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Breaks/Schedule</p>
                <p className="text-3xl font-bold text-foreground">{avgBreaksPerSchedule}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <Card className="p-6 bg-gradient-card border-border shadow-card mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Recent Achievements</h2>
            </div>
            <div className="space-y-3">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-4 bg-secondary rounded-lg border border-border flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {achievement.goal_type === "weekly_tasks" && "Weekly Tasks Goal"}
                      {achievement.goal_type === "break_adherence" && "Break Adherence Goal"}
                      {achievement.goal_type === "energy_balance" && "Energy Balance Goal"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Achieved {achievement.achieved_value}
                      {achievement.goal_type !== "weekly_tasks" && "%"} (Target: {achievement.target_value}
                      {achievement.goal_type !== "weekly_tasks" && "%"})
                    </p>
                  </div>
                  <div className="text-right">
                    <Trophy className="w-6 h-6 text-energy-medium mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {new Date(achievement.achieved_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Weekly Trend */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <h2 className="text-xl font-semibold text-foreground mb-4">Weekly Completion Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="tasks"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Energy Distribution */}
          <Card className="p-6 bg-gradient-card border-border shadow-card">
            <h2 className="text-xl font-semibold text-foreground mb-4">Energy Level Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={energyDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {energyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Productive Hours */}
          {productiveHours.length > 0 && (
            <Card className="p-6 bg-gradient-card border-border shadow-card">
              <h2 className="text-xl font-semibold text-foreground mb-4">Most Productive Hours</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productiveHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Break Adherence */}
          {schedules.length > 0 && (
            <Card className="p-6 bg-gradient-card border-border shadow-card">
              <h2 className="text-xl font-semibold text-foreground mb-4">Break Adherence</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={breakAdherence}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {breakAdherence.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <p className="text-sm text-muted-foreground mt-4 text-center">
                Schedules that included break times vs. continuous work
              </p>
            </Card>
          )}
        </div>

        {/* Break Adherence Analytics */}
        {session?.user && (
          <div className="grid grid-cols-1 gap-8 mb-8">
            <WeeklyReportCard userId={session.user.id} />
            <BreakAdherenceAnalytics userId={session.user.id} />
          </div>
        )}

        {completedTasks.length === 0 && (
          <Card className="p-12 bg-gradient-card border-border shadow-card text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No Data Yet</h3>
            <p className="text-muted-foreground">
              Complete tasks and create schedules to see your productivity insights here
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
