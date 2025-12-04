import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { ScheduledTask } from "@/components/ScheduleTimeline";
import { cn } from "@/lib/utils";

interface MonthlyCalendarProps {
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
  onDayClick,
  onTaskComplete,
}: MonthlyCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getTasksForDay = (date: Date): ScheduledTask[] => {
    const dayName = format(date, "EEEE");
    const today = new Date();
    
    // For weekly schedule
    if (Object.keys(weeklySchedule).length > 0) {
      return weeklySchedule[dayName] || [];
    }
    
    // For daily schedule (show on tomorrow)
    if (dailySchedule.length > 0) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (isSameDay(date, tomorrow)) {
        return dailySchedule;
      }
    }
    
    return [];
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    onDayClick?.(date);
  };

  const selectedDayTasks = selectedDate ? getTasksForDay(selectedDate) : [];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Calendar Grid */}
      <Card className="lg:col-span-2 p-6 bg-gradient-card border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const tasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const completedCount = tasks.filter(t => completedTaskIds.has(t.id)).length;
            const totalTasks = tasks.filter(t => !t.isBreak).length;

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "min-h-[100px] p-2 rounded-lg border transition-all text-left flex flex-col",
                  isCurrentMonth
                    ? "bg-secondary/50 border-border hover:bg-secondary"
                    : "bg-muted/20 border-transparent text-muted-foreground",
                  isToday && "ring-2 ring-primary",
                  isSelected && "bg-primary/10 border-primary"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-medium",
                    isToday && "text-primary"
                  )}
                >
                  {format(day, "d")}
                </span>

                {tasks.length > 0 && isCurrentMonth && (
                  <div className="mt-1 flex-1 space-y-1 overflow-hidden">
                    {tasks.slice(0, 3).map((task, idx) => (
                      <div
                        key={task.id + idx}
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded truncate",
                          task.isBreak
                            ? "bg-accent/20 text-accent-foreground"
                            : completedTaskIds.has(task.id)
                            ? "bg-green-500/20 text-green-700 dark:text-green-400 line-through"
                            : "bg-primary/20 text-primary"
                        )}
                      >
                        {task.title}
                      </div>
                    ))}
                    {tasks.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{tasks.length - 3} more
                      </div>
                    )}
                  </div>
                )}

                {totalTasks > 0 && isCurrentMonth && (
                  <div className="mt-auto pt-1">
                    <Badge variant="secondary" className="text-[10px] px-1">
                      {completedCount}/{totalTasks}
                    </Badge>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Day Detail Panel */}
      <Card className="p-6 bg-gradient-card border-border">
        {selectedDate ? (
          <>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {format(selectedDate, "EEEE")}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {format(selectedDate, "MMMM d, yyyy")}
            </p>

            {selectedDayTasks.length > 0 ? (
              <div className="space-y-2">
                {selectedDayTasks.map((task, idx) => (
                  <div
                    key={task.id + idx}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      task.isBreak
                        ? "bg-accent/10 border-accent/30"
                        : completedTaskIds.has(task.id)
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-secondary border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-medium text-foreground",
                            completedTaskIds.has(task.id) && "line-through text-muted-foreground"
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            {task.startTime} - {task.endTime}
                          </span>
                          <span>•</span>
                          <span>{task.duration}min</span>
                        </div>
                        {!task.isBreak && (
                          <div className="flex gap-1 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {task.energyLevel} energy
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {task.priority}
                            </Badge>
                          </div>
                        )}
                      </div>
                      {onTaskComplete && !completedTaskIds.has(task.id) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onTaskComplete(task, format(selectedDate, "EEEE"))}
                          className="text-primary hover:bg-primary/10"
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tasks scheduled for this day</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a day to view tasks</p>
          </div>
        )}
      </Card>
    </div>
  );
};
