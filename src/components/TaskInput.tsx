import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  duration: number;
  energyLevel: "high" | "medium" | "low";
  priority: "high" | "medium" | "low";
}

interface TaskInputProps {
  onAddTask: (task: Omit<Task, "id">) => void;
}

export const TaskInput = ({ onAddTask }: TaskInputProps) => {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("30");
  const [energyLevel, setEnergyLevel] = useState<Task["energyLevel"]>("medium");
  const [priority, setPriority] = useState<Task["priority"]>("medium");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      duration: parseInt(duration),
      energyLevel,
      priority,
    });

    setTitle("");
    setDuration("30");
    setEnergyLevel("medium");
    setPriority("medium");
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title" className="text-foreground">Task Name</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task name..."
            className="mt-1.5 bg-secondary border-border focus:border-primary transition-colors"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="duration" className="text-foreground">Duration (min)</Label>
            <Input
              id="duration"
              type="number"
              min="5"
              step="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="mt-1.5 bg-secondary border-border focus:border-primary transition-colors"
            />
          </div>

          <div>
            <Label htmlFor="energy" className="text-foreground">Energy Level</Label>
            <Select value={energyLevel} onValueChange={(v) => setEnergyLevel(v as Task["energyLevel"])}>
              <SelectTrigger id="energy" className="mt-1.5 bg-secondary border-border focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority" className="text-foreground">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
              <SelectTrigger id="priority" className="mt-1.5 bg-secondary border-border focus:border-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </form>
    </Card>
  );
};
