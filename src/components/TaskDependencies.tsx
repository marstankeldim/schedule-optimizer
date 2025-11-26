import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitBranch, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "./TaskInput";

interface TaskDependenciesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  allTasks: Task[];
  userId: string;
  onSuccess: () => void;
}

interface Dependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}

export const TaskDependencies = ({
  open,
  onOpenChange,
  task,
  allTasks,
  userId,
  onSuccess,
}: TaskDependenciesProps) => {
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [existingDependencies, setExistingDependencies] = useState<Dependency[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadDependencies();
    }
  }, [open, task.id]);

  const loadDependencies = async () => {
    const { data, error } = await supabase
      .from("task_dependencies")
      .select("*")
      .eq("task_id", task.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading dependencies:", error);
    } else {
      setExistingDependencies(data || []);
      setSelectedDependencies((data || []).map((d) => d.depends_on_task_id));
    }
  };

  const handleSave = async () => {
    // Delete removed dependencies
    const toDelete = existingDependencies.filter(
      (dep) => !selectedDependencies.includes(dep.depends_on_task_id)
    );
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("task_dependencies")
        .delete()
        .in("id", toDelete.map((d) => d.id));

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove dependencies",
          variant: "destructive",
        });
        return;
      }
    }

    // Add new dependencies
    const toAdd = selectedDependencies.filter(
      (taskId) => !existingDependencies.some((dep) => dep.depends_on_task_id === taskId)
    );
    if (toAdd.length > 0) {
      const { error } = await supabase.from("task_dependencies").insert(
        toAdd.map((dependsOnTaskId) => ({
          task_id: task.id,
          depends_on_task_id: dependsOnTaskId,
          user_id: userId,
        }))
      );

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add dependencies",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Dependencies updated",
      description: `Task dependencies have been updated`,
    });
    onOpenChange(false);
    onSuccess();
  };

  const toggleDependency = (taskId: string) => {
    setSelectedDependencies((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const availableTasks = allTasks.filter((t) => t.id !== task.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Task Dependencies
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Task: <span className="font-semibold text-foreground">{task.title}</span>
            </p>
            <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-accent/30">
              <AlertCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-xs text-accent-foreground">
                Select tasks that must be completed before this task can start
              </p>
            </div>
          </div>

          {availableTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No other tasks available</p>
              <p className="text-xs mt-1">Add more tasks to create dependencies</p>
            </div>
          ) : (
            <>
              <Label>Must be completed first:</Label>
              <ScrollArea className="h-[300px] rounded-md border border-border p-4">
                <div className="space-y-2">
                  {availableTasks.map((availableTask) => (
                    <div
                      key={availableTask.id}
                      className="flex items-start gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                    >
                      <Checkbox
                        id={availableTask.id}
                        checked={selectedDependencies.includes(availableTask.id)}
                        onCheckedChange={() => toggleDependency(availableTask.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={availableTask.id}
                          className="cursor-pointer font-medium text-foreground"
                        >
                          {availableTask.title}
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {availableTask.duration}m
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {availableTask.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Save Dependencies
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="bg-secondary border-border"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
