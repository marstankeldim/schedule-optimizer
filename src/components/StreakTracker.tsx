import { Card } from "@/components/ui/card";
import { Flame, Trophy, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
  loading?: boolean;
}

export const StreakTracker = ({ currentStreak, longestStreak, loading }: StreakTrackerProps) => {
  if (loading) {
    return (
      <Card className="p-6 bg-gradient-card border-border shadow-card">
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  const getStreakColor = (streak: number) => {
    if (streak === 0) return "text-muted-foreground";
    if (streak < 7) return "text-energy-medium";
    if (streak < 30) return "text-energy-high";
    return "text-primary";
  };

  const getStreakEmoji = (streak: number) => {
    if (streak === 0) return "🌱";
    if (streak < 7) return "🔥";
    if (streak < 30) return "⚡";
    return "👑";
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Your Streak</h3>
      </div>

      <div className="space-y-3">
        {/* Current Streak */}
        <div className="p-4 bg-secondary rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className={`w-5 h-5 ${getStreakColor(currentStreak)}`} />
              <span className="text-sm font-medium text-muted-foreground">Current Streak</span>
            </div>
            <span className="text-2xl">{getStreakEmoji(currentStreak)}</span>
          </div>
          <p className={`text-3xl font-bold ${getStreakColor(currentStreak)}`}>
            {currentStreak} {currentStreak === 1 ? "day" : "days"}
          </p>
          {currentStreak === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Complete all your tasks today to start a streak!
            </p>
          )}
          {currentStreak > 0 && currentStreak < 7 && (
            <p className="text-xs text-muted-foreground mt-2">
              Keep going! {7 - currentStreak} more {7 - currentStreak === 1 ? "day" : "days"} to reach 7 days
            </p>
          )}
          {currentStreak >= 7 && currentStreak < 30 && (
            <p className="text-xs text-muted-foreground mt-2">
              Amazing! {30 - currentStreak} more {30 - currentStreak === 1 ? "day" : "days"} to reach 30 days
            </p>
          )}
          {currentStreak >= 30 && (
            <p className="text-xs text-muted-foreground mt-2">
              You're a productivity champion! 🎉
            </p>
          )}
        </div>

        {/* Longest Streak */}
        <div className="p-4 bg-secondary rounded-lg border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Personal Best</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {longestStreak} {longestStreak === 1 ? "day" : "days"}
          </p>
          {currentStreak === longestStreak && longestStreak > 0 && (
            <p className="text-xs text-energy-high mt-2">
              🌟 You're at your personal best!
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
