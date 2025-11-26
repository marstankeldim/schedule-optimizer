import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Zap, Download, Calendar, Coffee, CheckCircle2, GripVertical, GitBranch, Repeat } from "lucide-react";
import type { Task } from "./TaskInput";
import { downloadICalFile } from "@/lib/icalGenerator";
import { useToast } from "@/hooks/use-toast";
import { useTaskDependencies } from "@/hooks/useTaskDependencies";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface ScheduledTask extends Task {
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

interface ScheduleTimelineProps {
  schedule: ScheduledTask[];
  onMarkComplete?: (task: ScheduledTask) => void;
  onReorder?: (newSchedule: ScheduledTask[]) => void;
  userId?: string;
}

interface SortableTaskItemProps {
  task: ScheduledTask;
  onMarkComplete?: (task: ScheduledTask) => void;
  hasDependencies?: boolean;
  dependenciesCount?: number;
}

const getEnergyColor = (level: Task["energyLevel"]) => {
  switch (level) {
    case "high":
      return "bg-energy-high/20 text-energy-high border-energy-high/30";
    case "medium":
      return "bg-energy-medium/20 text-energy-medium border-energy-medium/30";
    case "low":
      return "bg-energy-low/20 text-energy-low border-energy-low/30";
  }
};

const getPriorityLabel = (priority: Task["priority"]) => {
  switch (priority) {
    case "high":
      return "High Priority";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
};

const SortableTaskItem = ({ task, onMarkComplete, hasDependencies, dependenciesCount }: SortableTaskItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`p-4 ${
        task.isBreak 
          ? "bg-muted/50 border-muted-foreground/30" 
          : task.recurringTaskId
            ? "bg-gradient-card border-primary/40 ring-1 ring-primary/20 hover:shadow-glow"
            : "bg-gradient-card border-border hover:shadow-glow"
      } shadow-card transition-all duration-300 group ${
        isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="mt-1 text-muted-foreground hover:text-primary transition-colors cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className={`font-mono text-sm font-medium ${task.isBreak ? "text-muted-foreground" : "text-primary"}`}>
              {task.startTime} - {task.endTime}
            </span>
            {task.isBreak ? (
              <Badge variant="outline" className="bg-muted/20 text-muted-foreground border-muted-foreground/30">
                <Coffee className="w-3 h-3 mr-1" />
                Break
              </Badge>
            ) : (
              <>
                {task.recurringTaskId && (
                  <Badge variant="outline" className="bg-primary/20 text-primary border-primary/40">
                    <Repeat className="w-3 h-3 mr-1" />
                    Recurring
                  </Badge>
                )}
                <Badge variant="outline" className={getEnergyColor(task.energyLevel)}>
                  <Zap className="w-3 h-3 mr-1" />
                  {task.energyLevel}
                </Badge>
                <Badge variant="outline" className="border-border text-foreground">
                  {getPriorityLabel(task.priority)}
                </Badge>
                {hasDependencies && (
                  <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
                    <GitBranch className="w-3 h-3 mr-1" />
                    {dependenciesCount} {dependenciesCount === 1 ? 'dependency' : 'dependencies'}
                  </Badge>
                )}
              </>
            )}
          </div>
          <h3 className={`text-lg font-semibold ${
            task.isBreak ? "text-muted-foreground" : "text-foreground group-hover:text-primary"
          } transition-colors`}>
            {task.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Duration: {task.duration} minutes
          </p>
        </div>
        {!task.isBreak && onMarkComplete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onMarkComplete(task)}
            className="hover:bg-primary/10 hover:text-primary"
          >
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

export const ScheduleTimeline = ({ schedule, onMarkComplete, onReorder, userId }: ScheduleTimelineProps) => {
  const { toast } = useToast();
  const { getTaskDependencies } = useTaskDependencies(userId);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = schedule.findIndex((task) => task.id === active.id);
      const newIndex = schedule.findIndex((task) => task.id === over.id);

      const newSchedule = arrayMove(schedule, oldIndex, newIndex);
      
      // Recalculate times based on new order
      const recalculatedSchedule = recalculateTimes(newSchedule);
      
      if (onReorder) {
        onReorder(recalculatedSchedule);
      }
      
      toast({
        title: "Schedule reordered",
        description: "Task times have been automatically adjusted",
      });
    }
  };

  const recalculateTimes = (tasks: ScheduledTask[]): ScheduledTask[] => {
    if (tasks.length === 0) return tasks;
    
    const startTime = tasks[0].startTime;
    let currentTime = parseTime(startTime);
    
    return tasks.map((task) => {
      const start = formatTime(currentTime);
      currentTime += task.duration;
      const end = formatTime(currentTime);
      
      return {
        ...task,
        startTime: start,
        endTime: end,
      };
    });
  };

  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const handleExportCalendar = () => {
    downloadICalFile(schedule);
    toast({
      title: "Calendar exported",
      description: "Your schedule has been downloaded as an .ics file. Import it into Google Calendar, Outlook, or any calendar app.",
    });
  };

  if (schedule.length === 0) {
    return (
      <Card className="p-12 bg-gradient-card border-border shadow-card text-center">
        <div className="text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No tasks scheduled yet</p>
          <p className="text-sm mt-2">Add tasks and optimize your schedule with AI</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gradient-card border-border shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="font-semibold">Your Schedule ({schedule.length} tasks)</span>
          </div>
          <Button
            onClick={handleExportCalendar}
            variant="outline"
            size="sm"
            className="bg-secondary hover:bg-secondary/80 border-primary/30 text-foreground"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Calendar
          </Button>
        </div>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={schedule.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {schedule.map((task) => {
              const dependencies = task.isBreak ? [] : getTaskDependencies(task.id);
              return (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  onMarkComplete={onMarkComplete}
                  hasDependencies={dependencies.length > 0}
                  dependenciesCount={dependencies.length}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};
