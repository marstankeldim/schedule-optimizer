import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, CheckCircle2 } from "lucide-react";
import { ScheduledTask } from "@/components/ScheduleTimeline";
import { cn } from "@/lib/utils";

interface WeekViewCalendarProps {
  weeklySchedule: Record<string, ScheduledTask[]>;
  dailySchedule: ScheduledTask[];
  completedTaskIds: Set<string>;
  onDayClick?: (date: Date) => void;
  onTaskComplete?: (task: ScheduledTask, day: string) => void;
}

export const MonthlyCalendar = ({
  weeklySchedule,
  dailySchedule,
  completedTaskIds,
  onTaskComplete,
}: WeekViewCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getTasksForDay = (date: Date): ScheduledTask[] => {
    const dayName = format(date, "EEEE");
    const today = new Date();
    
    if (Object.keys(weeklySchedule).length > 0) {
      return weeklySchedule[dayName] || [];
    }
    
    if (dailySchedule.length > 0) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (isSameDay(date, tomorrow)) {
        return dailySchedule;
      }
    }
    
    return [];
  };

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  // Generate time slots from 6am to 10pm
  const timeSlots = Array.from({ length: 17 }, (_, i) => i + 6);

  const getTaskPosition = (task: ScheduledTask) => {
    const [startHour, startMin] = task.startTime.split(":").map(Number);
    const [endHour, endMin] = task.endTime.split(":").map(Number);
    
    const startOffset = (startHour - 6) * 60 + startMin;
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    return {
      top: `${(startOffset / 60) * 64}px`,
      height: `${Math.max((duration / 60) * 64, 24)}px`,
    };
  };

  // Current time indicator
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    if (hours < 6 || hours >= 22) return null; // Outside visible range
    const offset = (hours - 6) * 60 + minutes;
    return `${(offset / 60) * 64}px`;
  };

  const currentTimeTop = getCurrentTimePosition();

  return (
    <Card className="p-6 bg-gradient-card border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </h2>
          <p className="text-sm text-muted-foreground">Week {format(currentWeek, "w")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <div className="min-w-[800px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-1 sticky top-0 bg-background z-10 pb-2">
            <div className="w-16" /> {/* Time column spacer */}
            {days.map((day) => {
              const isToday = isSameDay(day, new Date());
              const tasks = getTasksForDay(day);
              const completedCount = tasks.filter(t => !t.isBreak && completedTaskIds.has(t.id)).length;
              const totalTasks = tasks.filter(t => !t.isBreak).length;

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "text-center p-2 rounded-lg",
                    isToday && "bg-primary/10"
                  )}
                >
                  <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                  <p className={cn(
                    "text-lg font-semibold",
                    isToday ? "text-primary" : "text-foreground"
                  )}>
                    {format(day, "d")}
                  </p>
                  {totalTasks > 0 && (
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {completedCount}/{totalTasks}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-8 gap-1">
            {/* Time Labels */}
            <div className="w-16">
              {timeSlots.map((hour) => (
                <div key={hour} className="h-16 text-xs text-muted-foreground pr-2 text-right">
                  {format(new Date().setHours(hour, 0), "h a")}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {days.map((day) => {
              const tasks = getTasksForDay(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative border-l border-border",
                    isToday && "bg-primary/5"
                  )}
                >
                  {/* Hour lines */}
                  {timeSlots.map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b border-border/50"
                    />
                  ))}

                  {/* Current time indicator */}
                  {isToday && currentTimeTop && (
                    <div
                      className="absolute left-0 right-0 z-20 pointer-events-none"
                      style={{ top: currentTimeTop }}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-destructive -ml-1" />
                        <div className="flex-1 h-0.5 bg-destructive" />
                      </div>
                    </div>
                  )}

                  {/* Tasks */}
                  {tasks.map((task, idx) => {
                    const position = getTaskPosition(task);
                    const isCompleted = completedTaskIds.has(task.id);

                    return (
                      <div
                        key={task.id + idx}
                        className={cn(
                          "absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 overflow-hidden cursor-pointer transition-all hover:shadow-md",
                          task.isBreak
                            ? "bg-accent/30 border border-accent/50"
                            : isCompleted
                            ? "bg-green-500/20 border border-green-500/50"
                            : task.priority === "high"
                            ? "bg-destructive/20 border border-destructive/50"
                            : task.priority === "medium"
                            ? "bg-primary/20 border border-primary/50"
                            : "bg-secondary border border-border"
                        )}
                        style={position}
                        onClick={() => onTaskComplete?.(task, format(day, "EEEE"))}
                      >
                        <div className="flex items-start gap-1">
                          {isCompleted && (
                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "text-xs font-medium truncate",
                              isCompleted && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {task.startTime} - {task.endTime}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
};
