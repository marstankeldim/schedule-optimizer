import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Edit2, Check, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Task } from "@/components/TaskInput";

interface PlanMyDayProps {
  userId: string;
  onTasksGenerated: (tasks: Task[]) => void;
}

interface GeneratedTask {
  title: string;
  duration: number;
  energyLevel: "low" | "medium" | "high";
  priority: "low" | "medium" | "high";
}

export const PlanMyDay = ({ userId, onTasksGenerated }: PlanMyDayProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedTask, setEditedTask] = useState<GeneratedTask | null>(null);
  const { toast } = useToast();

  const handlePlanDay = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('plan-day', {
        body: { userId },
      });

      if (error) throw error;

      setGeneratedTasks(data.tasks || []);
      toast({
        title: "Day Planned!",
        description: `Generated ${data.tasks?.length || 0} tasks based on your history`,
      });
    } catch (error) {
      console.error('Error planning day:', error);
      toast({
        title: "Error",
        description: "Failed to generate daily plan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditedTask({ ...generatedTasks[index] });
  };

  const saveEdit = () => {
    if (editingIndex !== null && editedTask) {
      const updated = [...generatedTasks];
      updated[editingIndex] = editedTask;
      setGeneratedTasks(updated);
      setEditingIndex(null);
      setEditedTask(null);
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditedTask(null);
  };

  const removeTask = (index: number) => {
    setGeneratedTasks(prev => prev.filter((_, i) => i !== index));
  };

  const applyTasks = () => {
    const tasks: Task[] = generatedTasks.map(t => ({
      id: crypto.randomUUID(),
      title: t.title,
      duration: t.duration,
      energyLevel: t.energyLevel,
      priority: t.priority,
    }));
    
    onTasksGenerated(tasks);
    setGeneratedTasks([]);
    toast({
      title: "Tasks Added",
      description: `${tasks.length} tasks added to your schedule`,
    });
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Plan My Day
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            AI generates tasks based on your history
          </p>
        </div>
        <Button
          onClick={handlePlanDay}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Planning...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Plan Day
            </>
          )}
        </Button>
      </div>

      {generatedTasks.length > 0 && (
        <div className="space-y-3 mt-4">
          {generatedTasks.map((task, idx) => (
            <div
              key={idx}
              className="p-3 bg-secondary rounded-lg border border-border"
            >
              {editingIndex === idx && editedTask ? (
                <div className="space-y-2">
                  <Input
                    value={editedTask.title}
                    onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                    className="bg-background"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      value={editedTask.duration}
                      onChange={(e) => setEditedTask({ ...editedTask, duration: parseInt(e.target.value) })}
                      className="bg-background"
                    />
                    <Select
                      value={editedTask.energyLevel}
                      onValueChange={(v) => setEditedTask({ ...editedTask, energyLevel: v as any })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={editedTask.priority}
                      onValueChange={(v) => setEditedTask({ ...editedTask, priority: v as any })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{task.title}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {task.duration}min
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.energyLevel} energy
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.priority} priority
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEditing(idx)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeTask(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          <Button
            onClick={applyTasks}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Apply {generatedTasks.length} Tasks
          </Button>
        </div>
      )}
    </Card>
  );
};
