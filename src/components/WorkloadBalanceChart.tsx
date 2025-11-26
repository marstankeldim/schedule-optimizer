import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import type { ScheduledTask } from "./ScheduleTimeline";

interface WorkloadBalanceChartProps {
  weeklySchedule: Record<string, ScheduledTask[]>;
}

export const WorkloadBalanceChart = ({ weeklySchedule }: WorkloadBalanceChartProps) => {
  const calculateDayStats = (daySchedule: ScheduledTask[]) => {
    let focusedWork = 0;
    let breaks = 0;

    daySchedule.forEach((task) => {
      const duration = task.duration || 0;
      if (task.isBreak) {
        breaks += duration;
      } else {
        focusedWork += duration;
      }
    });

    return {
      focusedWork: Math.round(focusedWork / 60 * 10) / 10, // Convert to hours, 1 decimal
      breaks: Math.round(breaks / 60 * 10) / 10,
    };
  };

  const chartData = Object.entries(weeklySchedule).map(([day, schedule]) => {
    const stats = calculateDayStats(schedule);
    return {
      day: day.substring(0, 3), // Mon, Tue, Wed, etc.
      "Focused Work": stats.focusedWork,
      "Breaks": stats.breaks,
    };
  });

  const hasData = chartData.some((d) => d["Focused Work"] > 0 || d["Breaks"] > 0);

  if (!hasData) {
    return null;
  }

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/20 rounded-lg">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Weekly Workload Balance</h3>
          <p className="text-xs text-muted-foreground">Hours of focused work vs. breaks per day</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--foreground))" }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fill: "hsl(var(--foreground))" }}
            label={{ value: "Hours", angle: -90, position: "insideLeft", fill: "hsl(var(--foreground))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
          <Bar dataKey="Focused Work" stackId="a" fill="hsl(var(--primary))" />
          <Bar dataKey="Breaks" stackId="a" fill="hsl(var(--accent))" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};