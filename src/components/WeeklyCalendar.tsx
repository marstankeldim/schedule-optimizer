import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, AlertCircle, Coffee } from "lucide-react";
import { ScheduledTask } from "@/components/ScheduleTimeline";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    <ScrollArea className="h-[calc(100vh-200px)] w-full">
      <div className="min-w-max">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-2 mb-3 sticky top-0 bg-background z-10 pb-3">
          {daysOfWeek.map((day) => {
            const daySchedule = weeklySchedule[day] || [];
            const tasks = daySchedule.filter(t => !t.isBreak);
            const totalDuration = tasks.reduce((sum, t) => sum + t.duration, 0);
            
            return (
              <Card key={day} className="p-2">
                <h3 className="font-semibold text-sm text-foreground">{day}</h3>
                <p className="text-xs text-muted-foreground">
                  {tasks.length} tasks • {totalDuration}min
                </p>
              </Card>
            );
          })}
        </div>

        {/* Calendar Body */}
        <div className="grid grid-cols-7 gap-2">
          {daysOfWeek.map((day) => {
            const daySchedule = weeklySchedule[day] || [];

            return (
              <div key={day} className="space-y-1.5 min-w-[140px]">
                {daySchedule.length === 0 ? (
                  <Card className="p-4">
                    <div className="text-center text-muted-foreground">
                      <Coffee className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">Rest day</p>
                    </div>
                  </Card>
                ) : (
                  daySchedule.map((task) => {
                    const isCompleted = completedTaskIds.has(task.id);
                    
                    return (
                      <Card
                        key={task.id}
                        className={`p-2 border transition-all ${
                          task.isBreak
                            ? "bg-muted/50 border-muted"
                            : isCompleted
                            ? "bg-success/10 border-success/50 opacity-60"
                            : "bg-card border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-xs ${
                              task.isBreak ? "text-muted-foreground" : "text-foreground"
                            } truncate`}>
                              {task.isBreak && <Coffee className="w-3 h-3 inline mr-1" />}
                              {task.title}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {task.startTime} - {task.endTime}
                            </p>
                          </div>
                          
                          {!task.isBreak && onMarkTaskComplete && !isCompleted && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 shrink-0"
                              onClick={() => onMarkTaskComplete(task, day)}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        {!task.isBreak && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${getEnergyColor(task.energyLevel)} px-1 py-0`}
                            >
                              <Zap className="w-2 h-2 mr-0.5" />
                              {task.energyLevel}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {getPriorityIcon(task.priority)}
                              <span className="ml-0.5">{task.priority}</span>
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              <Clock className="w-2 h-2 mr-0.5" />
                              {task.duration}m
                            </Badge>
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
};
