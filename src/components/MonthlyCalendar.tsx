import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from "date-fns";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  onTaskCreate?: (day: Date, startTime: string, duration: number, title?: string) => void;
  onTaskUpdate?: (task: ScheduledTask, day: Date, updates: Partial<ScheduledTask>) => void;
}

interface DraggableTaskProps {
  task: ScheduledTask;
  day: Date;
  position: { top: string; height: string; left: string; width: string };
  isCompleted: boolean;
  onComplete?: () => void;
  onResize?: (newDuration: number) => void;
  onDelete?: () => void;
  onOpenProperties?: () => void;
}

const DraggableTask = ({ task, day, position, isCompleted, onComplete, onResize, onDelete, onOpenProperties }: DraggableTaskProps) => {
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
      const newDuration = Math.round((newHeight / PIXELS_PER_HOUR) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
      if (newDuration >= SNAP_MINUTES && newDuration <= 480) {
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
      data-task-card="true"
      className={cn(
        "absolute rounded-lg px-2 py-1.5 overflow-hidden transition-all group shadow-sm",
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
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpenProperties?.();
      }}
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
        <div className="min-w-0 flex-1">
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.();
          }}
          className="shrink-0 p-1 rounded hover:bg-primary/20 text-primary"
          title="Mark complete"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
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
          data-no-create="true"
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

interface CreationDraft {
  day: Date;
  containerTop: number;
  containerHeight: number;
  startMinutes: number;
  currentMinutes: number;
}

interface EventDraft {
  title: string;
  startTime: string;
  duration: number;
  recurring: boolean;
  additionalTasks: string;
}

const START_HOUR = 6;
const PIXELS_PER_HOUR = 80;
const SNAP_MINUTES = 5;
const TOTAL_VISIBLE_MINUTES = 17 * 60;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const snapToFiveMinutes = (minutes: number) => Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;

const minutesFromOffsetToTime = (minutesFromStart: number) => {
  const totalMinutes = START_HOUR * 60 + minutesFromStart;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (totalMinutes: number) => {
  const bounded = clamp(totalMinutes, START_HOUR * 60, 22 * 60);
  const hours = Math.floor(bounded / 60);
  const minutes = bounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const pointerYToMinutes = (clientY: number, top: number, height: number) => {
  const y = clamp(clientY - top, 0, height);
  const rawMinutes = (y / PIXELS_PER_HOUR) * 60;
  return clamp(snapToFiveMinutes(rawMinutes), 0, TOTAL_VISIBLE_MINUTES);
};

const computeDayLayout = (tasks: ScheduledTask[]) => {
  const indexed = tasks.map((task, index) => ({
    index,
    start: timeToMinutes(task.startTime),
    end: timeToMinutes(task.endTime),
    column: 0,
    maxColumns: 1,
  })).sort((a, b) => (a.start - b.start) || (a.end - b.end));

  const active: typeof indexed = [];

  indexed.forEach((item) => {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= item.start) active.splice(i, 1);
    }

    const usedColumns = new Set(active.map((a) => a.column));
    let column = 0;
    while (usedColumns.has(column)) column += 1;
    item.column = column;
    active.push(item);

    const concurrent = active.length;
    active.forEach((a) => {
      a.maxColumns = Math.max(a.maxColumns, concurrent);
    });
  });

  const layout = new Map<number, { left: string; width: string }>();
  indexed.forEach((item) => {
    const widthPct = 100 / item.maxColumns;
    const leftPct = item.column * widthPct;
    layout.set(item.index, {
      left: `calc(${leftPct}% + 2px)`,
      width: `calc(${widthPct}% - 4px)`,
    });
  });

  return layout;
};

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
  onTaskCreate,
  onTaskUpdate,
}: WeekViewCalendarProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [activeTask, setActiveTask] = useState<{ task: ScheduledTask; day: Date } | null>(null);
  const [creationDraft, setCreationDraft] = useState<CreationDraft | null>(null);
  const [editingEvent, setEditingEvent] = useState<{ task: ScheduledTask; day: Date } | null>(null);
  const [eventDraft, setEventDraft] = useState<EventDraft>({
    title: "",
    startTime: "09:00",
    duration: 30,
    recurring: false,
    additionalTasks: "",
  });
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

  const timeSlots = Array.from({ length: 17 }, (_, i) => i + START_HOUR);

  const getTaskPosition = (task: ScheduledTask) => {
    const [startHour, startMin] = task.startTime.split(":").map(Number);
    const [endHour, endMin] = task.endTime.split(":").map(Number);
    
    const startOffset = (startHour - START_HOUR) * 60 + startMin;
    const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    return {
      top: `${(startOffset / 60) * PIXELS_PER_HOUR}px`,
      height: `${Math.max((duration / 60) * PIXELS_PER_HOUR, 40)}px`,
      left: "2px",
      width: "calc(100% - 4px)",
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
    if (hours < START_HOUR || hours >= 22) return null;
    const offset = (hours - START_HOUR) * 60 + minutes;
    return `${(offset / 60) * PIXELS_PER_HOUR}px`;
  };

  const currentTimeTop = getCurrentTimePosition();
  const calendarGridColumns = '56px repeat(7, minmax(0, 1fr))';

  const openPropertiesDialog = (task: ScheduledTask, day: Date) => {
    setEditingEvent({ task, day });
    setEventDraft({
      title: task.title,
      startTime: task.startTime,
      duration: task.duration,
      recurring: Boolean(task.recurringTaskId),
      additionalTasks: "",
    });
  };

  const handleSaveEventProperties = () => {
    if (!editingEvent) return;

    const { task, day } = editingEvent;
    const title = eventDraft.title.trim() || task.title;
    const duration = clamp(snapToFiveMinutes(eventDraft.duration || task.duration), SNAP_MINUTES, 480);
    const startTime = eventDraft.startTime;

    if (startTime !== task.startTime) {
      onTaskReschedule?.(task, day, day, startTime);
    }
    if (duration !== task.duration) {
      onTaskResize?.(task, day, duration);
    }

    const recurringTaskId = eventDraft.recurring ? (task.recurringTaskId || `manual-${task.id}`) : undefined;
    onTaskUpdate?.(task, day, { title, recurringTaskId });

    const additional = eventDraft.additionalTasks
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (additional.length > 0) {
      const baseStart = timeToMinutes(startTime) + duration;
      additional.forEach((line, idx) => {
        const extraStart = minutesToTime(baseStart + idx * duration);
        onTaskCreate?.(day, extraStart, duration, line);
      });
    }

    setEditingEvent(null);
  };

  useEffect(() => {
    if (!creationDraft) return;

    const handleMouseMove = (event: MouseEvent) => {
      setCreationDraft((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentMinutes: pointerYToMinutes(event.clientY, prev.containerTop, prev.containerHeight),
        };
      });
    };

    const handleMouseUp = () => {
      setCreationDraft((prev) => {
        if (!prev) return null;
        const startMinutes = Math.min(prev.startMinutes, prev.currentMinutes);
        const endMinutes = Math.max(prev.startMinutes, prev.currentMinutes);
        const duration = Math.max(SNAP_MINUTES, endMinutes - startMinutes);
        onTaskCreate?.(prev.day, minutesFromOffsetToTime(startMinutes), duration);
        return null;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [creationDraft, onTaskCreate]);

  const startCreateDraft = (event: React.MouseEvent<HTMLDivElement>, day: Date) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-task-card='true']") || target.closest("[data-no-create='true']")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const startMinutes = pointerYToMinutes(event.clientY, rect.top, rect.height);

    setCreationDraft({
      day,
      containerTop: rect.top,
      containerHeight: rect.height,
      startMinutes,
      currentMinutes: startMinutes,
    });
  };

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
        <div className="calendar-scroll overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'clamp(480px, calc(100vh - 260px), 820px)' }}>
          <div>
            {/* Day Headers */}
            <div className="grid gap-1 sticky top-0 bg-background z-10 pb-2" style={{ gridTemplateColumns: calendarGridColumns }}>
              <div className="w-[56px]" />
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
            <div className="grid gap-1" style={{ gridTemplateColumns: calendarGridColumns }}>
              {/* Time Labels */}
              <div className="w-[56px]">
                {timeSlots.map((hour) => (
                  <div key={hour} className="h-20 text-xs text-muted-foreground pr-2 text-right flex items-start pt-1">
                    {format(new Date().setHours(hour, 0), "h a")}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {days.map((day) => {
                const tasks = getTasksForDay(day);
                const dayLayout = computeDayLayout(tasks);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "relative border-l border-border select-none",
                      isToday && "bg-primary/5"
                    )}
                    onMouseDown={(event) => startCreateDraft(event, day)}
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

                    {creationDraft && isSameDay(day, creationDraft.day) && (() => {
                      const startMinutes = Math.min(creationDraft.startMinutes, creationDraft.currentMinutes);
                      const endMinutes = Math.max(creationDraft.startMinutes, creationDraft.currentMinutes);
                      const duration = Math.max(SNAP_MINUTES, endMinutes - startMinutes);
                      const top = (startMinutes / 60) * PIXELS_PER_HOUR;
                      const height = Math.max((duration / 60) * PIXELS_PER_HOUR, 8);
                      const startTime = minutesFromOffsetToTime(startMinutes);
                      const endTime = minutesFromOffsetToTime(startMinutes + duration);

                      return (
                        <div
                          className="absolute left-1 right-1 z-30 rounded-lg border-2 border-dashed border-primary bg-primary/20 px-2 py-1 pointer-events-none"
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <p className="text-[11px] font-semibold text-foreground">New Event</p>
                          <p className="text-[10px] text-muted-foreground">
                            {startTime} - {endTime} ({duration}m)
                          </p>
                        </div>
                      );
                    })()}

                    {/* Tasks */}
                    {tasks.map((task, idx) => {
                      const layout = dayLayout.get(idx);
                      const position = {
                        ...getTaskPosition(task),
                        left: layout?.left || "2px",
                        width: layout?.width || "calc(100% - 4px)",
                      };
                      const isCompleted = completedTaskIds.has(task.id);

                      return (
                        <DraggableTask
                          key={task.id + idx}
                          task={task}
                          day={day}
                          position={position}
                          isCompleted={isCompleted}
                          onComplete={() => onTaskComplete?.(task, day)}
                          onResize={(newDuration) => onTaskResize?.(task, day, newDuration)}
                          onDelete={() => onTaskDelete?.(task, day)}
                          onOpenProperties={() => openPropertiesDialog(task, day)}
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

      <Dialog open={Boolean(editingEvent)} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="event-title">Name</Label>
              <Input
                id="event-title"
                value={eventDraft.title}
                onChange={(e) => setEventDraft((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="event-time">Start Time</Label>
                <Input
                  id="event-time"
                  type="time"
                  value={eventDraft.startTime}
                  onChange={(e) => setEventDraft((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="event-duration">Duration (min)</Label>
                <Input
                  id="event-duration"
                  type="number"
                  min={SNAP_MINUTES}
                  step={SNAP_MINUTES}
                  value={eventDraft.duration}
                  onChange={(e) => setEventDraft((prev) => ({ ...prev, duration: Number(e.target.value) || SNAP_MINUTES }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={eventDraft.recurring}
                onChange={(e) => setEventDraft((prev) => ({ ...prev, recurring: e.target.checked }))}
              />
              Make recurring
            </label>

            <div>
              <Label htmlFor="event-additional">Add more tasks (one per line)</Label>
              <textarea
                id="event-additional"
                className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Task 1&#10;Task 2"
                value={eventDraft.additionalTasks}
                onChange={(e) => setEventDraft((prev) => ({ ...prev, additionalTasks: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvent(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEventProperties}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
