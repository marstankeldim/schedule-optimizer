import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CheckCircle2, GripVertical, X } from "lucide-react";
import { ScheduledTask } from "@/components/ScheduleTimeline";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WeekViewCalendarProps {
  weeklySchedule: Record<string, ScheduledTask[]>;
  dailySchedule: ScheduledTask[];
  completedTaskIds: Set<string>;
  onDayClick?: (date: Date) => void;
  onTaskComplete?: (task: ScheduledTask, day: Date) => void;
  onTaskReschedule?: (task: ScheduledTask, fromDay: Date, toDay: Date, newStartTime: string) => void;
  onTaskResize?: (task: ScheduledTask, day: Date, newDuration: number) => void;
  onTaskDelete?: (task: ScheduledTask, day: Date) => void;
}

interface DraggableTaskProps {
  task: ScheduledTask;
  day: Date;
  position: { top: string; height: string };
  isCompleted: boolean;
  onComplete?: () => void;
  onResize?: (newDuration: number) => void;
  onDelete?: () => void;
}

const DraggableTask = ({ task, day, position, isCompleted, onComplete, onResize, onDelete }: DraggableTaskProps) => {
  const dayKey = format(day, "yyyy-MM-dd");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${task.id}-${dayKey}`,
    data: { task, day },
  });

  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [initialHeight, setInitialHeight] = useState(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeStartY(e.clientY);
    setInitialHeight(parseFloat(position.height));
  }, [position.height]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartY;
      const newHeight = Math.max(40, initialHeight + deltaY);
      // Convert height back to duration (80px = 1 hour = 60 minutes)
      const newDuration = Math.round((newHeight / 80) * 60 / 15) * 15; // Round to 15 min increments
      if (newDuration >= 15 && newDuration <= 480) {
        onResize?.(newDuration);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartY, initialHeight, onResize]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute left-1 right-1 rounded-lg px-2 py-1.5 overflow-hidden transition-all group shadow-sm",
        isDragging ? "opacity-50 z-50" : "hover:shadow-lg",
        isResizing && "z-50",
        task.isBreak
          ? "bg-accent/40 border-2 border-accent/60"
          : isCompleted
          ? "bg-green-500/30 border-2 border-green-500/60"
          : task.priority === "high"
          ? "bg-destructive/30 border-2 border-destructive/60"
          : task.priority === "medium"
          ? "bg-primary/30 border-2 border-primary/60"
          : "bg-secondary border-2 border-border"
      )}
      style={position}
    >
      <div className="flex items-start gap-1.5">
        {!task.isBreak && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        {isCompleted && (
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onComplete}>
          <p className={cn(
            "text-sm font-medium line-clamp-2",
            isCompleted && "line-through text-muted-foreground"
          )}>
            {task.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {task.startTime} - {task.endTime}
          </p>
        </div>
        {/* Delete button */}
        {!task.isBreak && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 hover:bg-destructive/20 rounded"
          >
            <X className="w-4 h-4 text-destructive" />
          </button>
        )}
      </div>
      
      {/* Resize handle */}
      {!task.isBreak && (
        <div
          onMouseDown={handleResizeStart}
          className={cn(
            "absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity",
            "flex items-center justify-center bg-gradient-to-t from-background/50 to-transparent",
            isResizing && "opacity-100"
          )}
        >
          <div className="w-10 h-1.5 bg-muted-foreground/60 rounded-full" />
        </div>
      )}
    </div>
  );
};

interface DroppableSlotProps {
  day: Date;
  hour: number;
  children?: React.ReactNode;
}

const DroppableSlot = ({ day, hour, children }: DroppableSlotProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `${format(day, "yyyy-MM-dd")}-${hour}`,
    data: { day, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-20 border-b border-border/50 transition-colors",
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
  onTaskResize,
  onTaskDelete,
}: WeekViewCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [activeTask, setActiveTask] = useState<{ task: ScheduledTask; day: Date } | null>(null);
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
      top: `${(startOffset / 60) * 80}px`,
      height: `${Math.max((duration / 60) * 80, 40)}px`,
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
    return `${(offset / 60) * 80}px`;
  };

  const currentTimeTop = getCurrentTimePosition();

  const handleDragStart = (event: DragStartEvent) => {
    const { task, day } = event.active.data.current as { task: ScheduledTask; day: Date };
    setActiveTask({ task, day });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const { task, day: fromDay } = active.data.current as { task: ScheduledTask; day: Date };
    const { day: toDay, hour } = over.data.current as { day: Date; hour: number };

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
        description: `${task.title} moved to ${format(toDay, "EEEE")} at ${newStartTime}`,
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
          <p className="text-sm text-muted-foreground">Week {format(currentWeek, "w")} • Drag to move, resize from bottom</p>
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
        {/* Calendar Grid - Scrollable container */}
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div style={{ minWidth: '1200px' }}>
            {/* Day Headers */}
            <div className="grid gap-1 sticky top-0 bg-background z-10 pb-2" style={{ gridTemplateColumns: '60px repeat(7, minmax(150px, 1fr))' }}>
              <div className="w-[60px]" />
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
            <div className="grid gap-1" style={{ gridTemplateColumns: '60px repeat(7, minmax(150px, 1fr))' }}>
              {/* Time Labels */}
              <div className="w-[60px]">
                {timeSlots.map((hour) => (
                  <div key={hour} className="h-20 text-xs text-muted-foreground pr-2 text-right flex items-start pt-1">
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
                          onComplete={() => onTaskComplete?.(task, day)}
                          onResize={(newDuration) => onTaskResize?.(task, day, newDuration)}
                          onDelete={() => onTaskDelete?.(task, day)}
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
