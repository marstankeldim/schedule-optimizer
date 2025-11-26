import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap } from "lucide-react";
import type { Task } from "./TaskInput";

export interface ScheduledTask extends Task {
  startTime: string;
  endTime: string;
}

interface ScheduleTimelineProps {
  schedule: ScheduledTask[];
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

export const ScheduleTimeline = ({ schedule }: ScheduleTimelineProps) => {
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
    <div className="space-y-3">
      {schedule.map((task) => (
        <Card
          key={task.id}
          className="p-4 bg-gradient-card border-border shadow-card hover:shadow-glow transition-all duration-300 group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-primary font-mono text-sm font-medium">
                  {task.startTime} - {task.endTime}
                </span>
                <Badge variant="outline" className={getEnergyColor(task.energyLevel)}>
                  <Zap className="w-3 h-3 mr-1" />
                  {task.energyLevel}
                </Badge>
                <Badge variant="outline" className="border-border text-foreground">
                  {getPriorityLabel(task.priority)}
                </Badge>
              </div>
              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                {task.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Duration: {task.duration} minutes
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
