import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Play, Pause, SkipForward, Coffee } from "lucide-react";
import { ScheduledTask } from "./ScheduleTimeline";

interface FocusModeProps {
  currentTask: ScheduledTask | null;
  onExit: () => void;
  onComplete: (taskId: string) => void;
}

export const FocusMode = ({ currentTask, onExit, onComplete }: FocusModeProps) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (currentTask) {
      // Calculate time remaining based on task end time
      const endTime = new Date(currentTask.endTime);
      const now = new Date();
      const remainingMs = endTime.getTime() - now.getTime();
      setTimeRemaining(Math.max(0, Math.floor(remainingMs / 1000)));
      setIsRunning(true);
      setIsPaused(false);
    }
  }, [currentTask]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, timeRemaining]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const handleComplete = () => {
    if (currentTask) {
      onComplete(currentTask.id);
    }
  };

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-destructive text-destructive";
      case "medium":
        return "border-accent text-accent-foreground";
      case "low":
        return "border-muted text-muted-foreground";
      default:
        return "border-border text-foreground";
    }
  };

  if (!currentTask) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <Coffee className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">No Active Task</h2>
          <p className="text-muted-foreground mb-6">
            There's no task scheduled for this time. Take a break or start working on your next task!
          </p>
          <Button onClick={onExit} variant="outline">
            Exit Focus Mode
          </Button>
        </Card>
      </div>
    );
  }

  const isBreak = currentTask.title.toLowerCase().includes("break");

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Button
        onClick={onExit}
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
      >
        <X className="w-6 h-6" />
      </Button>

      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            {isBreak ? (
              <Coffee className="w-8 h-8 text-primary" />
            ) : (
              <Badge className={getEnergyColor(currentTask.energyLevel)}>
                {currentTask.energyLevel} energy
              </Badge>
            )}
            <Badge variant="outline" className={getPriorityColor(currentTask.priority)}>
              {currentTask.priority} priority
            </Badge>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-foreground tracking-tight">
            {currentTask.title}
          </h1>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-12 shadow-2xl">
            <div className="text-8xl md:text-9xl font-mono font-bold text-primary tracking-wider">
              {formatTime(timeRemaining)}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {timeRemaining === 0 ? "Time's up!" : "remaining"}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button
              onClick={togglePause}
              size="lg"
              variant="outline"
              className="w-32"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>

            <Button
              onClick={handleComplete}
              size="lg"
              className="w-32 bg-primary hover:bg-primary/90"
            >
              <SkipForward className="w-4 h-4 mr-2" />
              Complete
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            Started: {new Date(currentTask.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p>
            Scheduled to end: {new Date(currentTask.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs mt-4 opacity-60">
            Press ESC to exit focus mode
          </p>
        </div>
      </div>
    </div>
  );
};
