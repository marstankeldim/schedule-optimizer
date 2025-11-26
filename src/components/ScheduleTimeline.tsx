import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Zap, Download, Calendar, Coffee, CheckCircle2 } from "lucide-react";
import type { Task } from "./TaskInput";
import { downloadICalFile } from "@/lib/icalGenerator";
import { useToast } from "@/hooks/use-toast";

export interface ScheduledTask extends Task {
  startTime: string;
  endTime: string;
  isBreak?: boolean;
}

interface ScheduleTimelineProps {
  schedule: ScheduledTask[];
  onMarkComplete?: (task: ScheduledTask) => void;
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

export const ScheduleTimeline = ({ schedule, onMarkComplete }: ScheduleTimelineProps) => {
  const { toast } = useToast();

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

      {schedule.map((task) => (
        <Card
          key={task.id}
          className={`p-4 ${
            task.isBreak 
              ? "bg-muted/50 border-muted-foreground/30" 
              : "bg-gradient-card border-border hover:shadow-glow"
          } shadow-card transition-all duration-300 group`}
        >
          <div className="flex items-start justify-between">
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
                    <Badge variant="outline" className={getEnergyColor(task.energyLevel)}>
                      <Zap className="w-3 h-3 mr-1" />
                      {task.energyLevel}
                    </Badge>
                    <Badge variant="outline" className="border-border text-foreground">
                      {getPriorityLabel(task.priority)}
                    </Badge>
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
      ))}
    </div>
  );
};
