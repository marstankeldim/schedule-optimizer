import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, AlertCircle, Coffee } from "lucide-react";
import { ScheduledTask } from "@/components/ScheduleTimeline";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface WeeklySchedule {
  [day: string]: ScheduledTask[];
}

interface WeeklyCalendarProps {
  weeklySchedule: WeeklySchedule;
  onMarkTaskComplete?: (task: ScheduledTask, day: string) => void;
  completedTaskIds?: Set<string>;
}

export const WeeklyCalendar = ({ 
  weeklySchedule, 
  onMarkTaskComplete,
  completedTaskIds = new Set()
}: WeeklyCalendarProps) => {
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const getEnergyColor = (level: string) => {
    switch (level) {
      case "high":
        return "bg-primary text-primary-foreground";
      case "medium":
        return "bg-accent text-accent-foreground";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="w-3 h-3" />;
      case "medium":
        return <Zap className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {daysOfWeek.map((day) => {
        const daySchedule = weeklySchedule[day] || [];
        const tasks = daySchedule.filter(t => !t.isBreak);
        const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0);

        return (
          <Card key={day} className="p-4 flex flex-col">
            <div className="mb-3 pb-3 border-b border-border">
              <h3 className="font-semibold text-lg text-foreground">{day}</h3>
              <p className="text-sm text-muted-foreground">
                {tasks.length} tasks • {totalDuration}min
              </p>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px]">
              {daySchedule.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Coffee className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Rest day</p>
                </div>
              ) : (
                daySchedule.map((task) => {
                  const isCompleted = completedTaskIds.has(task.id);
                  
                  return (
                    <Card
                      key={task.id}
                      className={`p-3 border transition-all ${
                        task.isBreak
                          ? "bg-muted/50 border-muted"
                          : isCompleted
                          ? "bg-success/10 border-success/50 opacity-60"
                          : "bg-card border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm ${
                            task.isBreak ? "text-muted-foreground" : "text-foreground"
                          } truncate`}>
                            {task.isBreak && <Coffee className="w-3 h-3 inline mr-1" />}
                            {task.title}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.startTime} - {task.endTime}
                          </p>
                        </div>
                        
                        {!task.isBreak && onMarkTaskComplete && !isCompleted && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={() => onMarkTaskComplete(task, day)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {!task.isBreak && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getEnergyColor(task.energyLevel)}`}
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            {task.energyLevel}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getPriorityIcon(task.priority)}
                            <span className="ml-1">{task.priority}</span>
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {task.duration}m
                          </Badge>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
