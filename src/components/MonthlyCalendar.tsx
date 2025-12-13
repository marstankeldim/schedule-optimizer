import { useState, useEffect } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CheckCircle2, GripVertical } from "lucide-react";
import { ScheduledTask } from "@/components/ScheduleTimeline";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WeekViewCalendarProps {
  weeklySchedule: Record<string, ScheduledTask[]>;
  dailySchedule: ScheduledTask[];
  completedTaskIds: Set<string>;
  onDayClick?: (date: Date) => void;
  onTaskComplete?: (task: ScheduledTask, day: string) => void;
  onTaskReschedule?: (task: ScheduledTask, fromDay: string, toDay: string, newStartTime: string) => void;
}

interface DraggableTaskProps {
  task: ScheduledTask;
  day: string;
  position: { top: string; height: string };
  isCompleted: boolean;
  onComplete?: () => void;
}

const DraggableTask = ({ task, day, position, isCompleted, onComplete }: DraggableTaskProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${task.id}-${day}`,
    data: { task, day },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 overflow-hidden transition-all group",
        isDragging ? "opacity-50 z-50" : "hover:shadow-md",
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
    >
      <div className="flex items-start gap-1">
        {!task.isBreak && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
          >
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
        {isCompleted && (
          <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onComplete}>
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
};

interface DroppableSlotProps {
  day: Date;
  hour: number;
  children?: React.ReactNode;
}

const DroppableSlot = ({ day, hour, children }: DroppableSlotProps) => {
  const dayName = format(day, "EEEE");
  const { setNodeRef, isOver } = useDroppable({
    id: `${dayName}-${hour}`,
    data: { day: dayName, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-16 border-b border-border/50 transition-colors",
        isOver && "bg-primary/20"
      )}
    >
      {children}
    </div>
  );
};

export const MonthlyCalendar = ({
  weeklySchedule,
  dailySchedule,
  completedTaskIds,
  onTaskComplete,
  onTaskReschedule,
}: WeekViewCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [activeTask, setActiveTask] = useState<{ task: ScheduledTask; day: string } | null>(null);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    if (hours < 6 || hours >= 22) return null;
    const offset = (hours - 6) * 60 + minutes;
    return `${(offset / 60) * 64}px`;
  };

  const currentTimeTop = getCurrentTimePosition();

  const handleDragStart = (event: DragStartEvent) => {
    const { task, day } = event.active.data.current as { task: ScheduledTask; day: string };
    setActiveTask({ task, day });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const { task, day: fromDay } = active.data.current as { task: ScheduledTask; day: string };
    const { day: toDay, hour } = over.data.current as { day: string; hour: number };

    if (task.isBreak) {
      toast({
        title: "Cannot move breaks",
        description: "Breaks are automatically scheduled",
        variant: "destructive",
      });
      return;
    }

    const newStartTime = `${String(hour).padStart(2, '0')}:00`;
    
    if (fromDay !== toDay || task.startTime !== newStartTime) {
      onTaskReschedule?.(task, fromDay, toDay, newStartTime);
      toast({
        title: "Task rescheduled",
        description: `${task.title} moved to ${toDay} at ${newStartTime}`,
      });
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </h2>
          <p className="text-sm text-muted-foreground">Week {format(currentWeek, "w")} • Drag tasks to reschedule</p>
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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Calendar Grid */}
        <div className="overflow-auto max-h-[calc(100vh-280px)]">
          <div className="min-w-[800px]">
            {/* Day Headers */}
            <div className="grid grid-cols-8 gap-1 sticky top-0 bg-background z-10 pb-2">
              <div className="w-16" />
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
                const dayName = format(day, "EEEE");

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative border-l border-border",
                      isToday && "bg-primary/5"
                    )}
                  >
                    {/* Droppable Hour slots */}
                    {timeSlots.map((hour) => (
                      <DroppableSlot key={hour} day={day} hour={hour} />
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
                        <DraggableTask
                          key={task.id + idx}
                          task={task}
                          day={dayName}
                          position={position}
                          isCompleted={isCompleted}
                          onComplete={() => onTaskComplete?.(task, dayName)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTask && (
            <div
              className={cn(
                "rounded-md px-2 py-1 shadow-lg border-2",
                activeTask.task.priority === "high"
                  ? "bg-destructive/30 border-destructive"
                  : activeTask.task.priority === "medium"
                  ? "bg-primary/30 border-primary"
                  : "bg-secondary border-border"
              )}
              style={{ width: 120 }}
            >
              <p className="text-xs font-medium truncate">{activeTask.task.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {activeTask.task.startTime} - {activeTask.task.endTime}
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </Card>
  );
};
