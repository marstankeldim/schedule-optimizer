import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, ChevronDown } from "lucide-react";
import { format } from "date-fns";

interface CompletedTask {
  id: string;
  task_title: string;
  task_duration: number;
  energy_level: string;
  priority: string;
  completed_at: string;
}

interface TaskHistoryProps {
  userId: string;
}

export function TaskHistory({ userId }: TaskHistoryProps) {
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    loadCompletedTasks();
  }, [userId]);

  const loadCompletedTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("completed_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading completed tasks:", error);
    } else {
      setCompletedTasks(data || []);
    }
    setIsLoading(false);
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 5);
  };

  const visibleTasks = completedTasks.slice(0, visibleCount);
  const hasMore = visibleCount < completedTasks.length;

  const getEnergyColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-energy-high/20 text-energy-high border-energy-high/30";
      case "medium":
        return "bg-energy-medium/20 text-energy-medium border-energy-medium/30";
      case "low":
        return "bg-energy-low/20 text-energy-low border-energy-low/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "High Priority";
      case "medium":
        return "Medium Priority";
      case "low":
        return "Low Priority";
      default:
        return priority;
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-card border-border">
        <p className="text-muted-foreground">Loading task history...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-border">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Task History</h2>
      {completedTasks.length === 0 ? (
        <p className="text-muted-foreground">No completed tasks yet. Start completing tasks to build your history!</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {visibleTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-foreground">{task.task_title}</h3>
                  <Badge variant="outline" className={getEnergyColor(task.energy_level)}>
                    <Zap className="w-3 h-3 mr-1" />
                    {task.energy_level}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.task_duration} min
                  </span>
                  <Badge variant="secondary">{getPriorityLabel(task.priority)}</Badge>
                  <span className="ml-auto">
                    {format(new Date(task.completed_at), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <Button
              onClick={handleShowMore}
              variant="outline"
              className="w-full border-border hover:bg-muted"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Show More ({completedTasks.length - visibleCount} remaining)
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
