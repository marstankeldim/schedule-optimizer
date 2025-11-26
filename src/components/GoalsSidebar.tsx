import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, Trophy, Coffee, Zap, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: string;
  type: string;
  target_value: number;
  current_value: number;
  week_start: string;
  achieved: boolean;
}

interface GoalsSidebarProps {
  userId: string;
  onGoalAchieved?: () => void;
}

export const GoalsSidebar = ({ userId, onGoalAchieved }: GoalsSidebarProps) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    type: "weekly_tasks",
    target: 10,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    // Get start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .gte("week_start", weekStart.toISOString().split('T')[0])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading goals:", error);
    } else {
      setGoals(data || []);
    }
  };

  const createGoal = async () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const { error } = await supabase.from("goals").insert({
      user_id: userId,
      type: newGoal.type,
      target_value: newGoal.target,
      week_start: weekStart.toISOString().split('T')[0],
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Goal created!",
        description: "Your new goal has been set for this week",
      });
      setIsOpen(false);
      loadGoals();
    }
  };

  const getGoalIcon = (type: string) => {
    switch (type) {
      case "weekly_tasks":
        return <Target className="w-4 h-4" />;
      case "break_adherence":
        return <Coffee className="w-4 h-4" />;
      case "energy_balance":
        return <Zap className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getGoalLabel = (type: string) => {
    switch (type) {
      case "weekly_tasks":
        return "Weekly Tasks";
      case "break_adherence":
        return "Break Adherence";
      case "energy_balance":
        return "Energy Balance";
      default:
        return type;
    }
  };

  const getProgress = (goal: Goal) => {
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Weekly Goals</h3>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Set New Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="goalType">Goal Type</Label>
                <select
                  id="goalType"
                  value={newGoal.type}
                  onChange={(e) => setNewGoal({ ...newGoal, type: e.target.value })}
                  className="w-full mt-1.5 p-2 bg-secondary border border-border rounded-md text-foreground"
                >
                  <option value="weekly_tasks">Weekly Task Completion</option>
                  <option value="break_adherence">Break Adherence Rate</option>
                  <option value="energy_balance">Energy Level Balance</option>
                </select>
              </div>
              <div>
                <Label htmlFor="target">
                  Target {newGoal.type === "weekly_tasks" ? "(number of tasks)" : "(percentage)"}
                </Label>
                <Input
                  id="target"
                  type="number"
                  min="1"
                  max={newGoal.type === "weekly_tasks" ? "100" : "100"}
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: parseInt(e.target.value) })}
                  className="mt-1.5 bg-secondary border-border"
                />
              </div>
              <Button onClick={createGoal} className="w-full bg-primary hover:bg-primary/90">
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No goals set for this week</p>
          <p className="text-xs text-muted-foreground mt-1">Click + to create your first goal</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="p-4 bg-secondary rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getGoalIcon(goal.type)}
                  <span className="font-medium text-foreground text-sm">
                    {getGoalLabel(goal.type)}
                  </span>
                </div>
                {goal.achieved && (
                  <Badge className="bg-energy-medium text-card">
                    <Trophy className="w-3 h-3 mr-1" />
                    Achieved!
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <Progress value={getProgress(goal)} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {goal.current_value} / {goal.target_value}
                    {goal.type !== "weekly_tasks" && "%"}
                  </span>
                  <span>{Math.round(getProgress(goal))}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
