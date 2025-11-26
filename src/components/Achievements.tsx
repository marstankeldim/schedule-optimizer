import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ACHIEVEMENTS, useAchievements } from "@/hooks/useAchievements";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AchievementsProps {
  userId: string;
  currentStreak?: number;
}

export const Achievements = ({ userId, currentStreak }: AchievementsProps) => {
  const [activeTab, setActiveTab] = useState<"unlocked" | "progress" | "locked">("unlocked");
  const {
    loading,
    getUnlockedAchievements,
    getProgressAchievements,
    getLockedAchievements,
  } = useAchievements(userId);

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-card border-border shadow-card">
        <Skeleton className="h-8 w-32 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Card>
    );
  }

  const unlocked = getUnlockedAchievements();
  const inProgress = getProgressAchievements();
  const locked = getLockedAchievements();

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Achievements</h3>
        <Badge variant="outline" className="ml-auto bg-primary/20 text-primary border-primary/30">
          {unlocked.length}/{ACHIEVEMENTS.length}
        </Badge>
      </div>

      {/* Custom Tab Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={activeTab === "unlocked" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("unlocked")}
          className="flex-1"
        >
          Unlocked ({unlocked.length})
        </Button>
        <Button
          variant={activeTab === "progress" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("progress")}
          className="flex-1"
        >
          In Progress ({inProgress.length})
        </Button>
        <Button
          variant={activeTab === "locked" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("locked")}
          className="flex-1"
        >
          Locked ({locked.length})
        </Button>
      </div>

      {/* Tab Content */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {activeTab === "unlocked" && (
          unlocked.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No achievements unlocked yet</p>
              <p className="text-sm mt-1">Complete tasks to unlock badges!</p>
            </div>
          ) : (
            unlocked.map((achievement: any) => (
              <div
                key={achievement.achievement_id}
                className="p-4 bg-secondary rounded-lg border border-primary/30 shadow-glow"
              >
                <div className="flex items-start gap-3">
                  <span className="text-4xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      {achievement.name}
                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 text-xs">
                        Unlocked
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {achievement.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Unlocked on{" "}
                      {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === "progress" && (
          inProgress.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No achievements in progress</p>
              <p className="text-sm mt-1">Start completing tasks to unlock badges!</p>
            </div>
          ) : (
            inProgress.map((achievement: any) => {
              const progressPercent = Math.floor(
                (achievement.progress / achievement.requirement) * 100
              );
              return (
                <div
                  key={achievement.achievement_id}
                  className="p-4 bg-secondary rounded-lg border border-border"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl opacity-50">{achievement.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">
                        {achievement.name}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {achievement.description}
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {achievement.progress} / {achievement.requirement}
                          </span>
                          <span className="font-medium text-primary">
                            {progressPercent}%
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}

        {activeTab === "locked" && (
          locked.map((achievement) => (
            <div
              key={achievement.id}
              className="p-4 bg-secondary/50 rounded-lg border border-border/50 opacity-60"
            >
              <div className="flex items-start gap-3">
                <div className="relative">
                  <span className="text-4xl grayscale opacity-50">
                    {achievement.icon}
                  </span>
                  <Lock className="w-4 h-4 absolute -bottom-1 -right-1 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">
                    {achievement.name}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};
