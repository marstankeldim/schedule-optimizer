import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Video, Brain, Coffee, Phone, FileText, Code, Users, Clock, Zap } from "lucide-react";
import type { Task } from "./TaskInput";

export interface TaskTemplate {
  id: string;
  title: string;
  duration: number;
  energyLevel: "high" | "medium" | "low";
  priority: "high" | "medium" | "low";
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

const templates: TaskTemplate[] = [
  {
    id: "deep-work",
    title: "Deep Work Session",
    duration: 90,
    energyLevel: "high",
    priority: "high",
    icon: Brain,
    category: "Focus",
  },
  {
    id: "meeting",
    title: "Team Meeting",
    duration: 60,
    energyLevel: "medium",
    priority: "medium",
    icon: Video,
    category: "Collaboration",
  },
  {
    id: "email",
    title: "Email Processing",
    duration: 30,
    energyLevel: "low",
    priority: "low",
    icon: Mail,
    category: "Admin",
  },
  {
    id: "one-on-one",
    title: "1:1 Meeting",
    duration: 30,
    energyLevel: "medium",
    priority: "high",
    icon: Users,
    category: "Collaboration",
  },
  {
    id: "code-review",
    title: "Code Review",
    duration: 45,
    energyLevel: "high",
    priority: "medium",
    icon: Code,
    category: "Development",
  },
  {
    id: "phone-calls",
    title: "Phone Calls",
    duration: 30,
    energyLevel: "medium",
    priority: "medium",
    icon: Phone,
    category: "Communication",
  },
  {
    id: "documentation",
    title: "Documentation",
    duration: 60,
    energyLevel: "medium",
    priority: "low",
    icon: FileText,
    category: "Writing",
  },
  {
    id: "break",
    title: "Short Break",
    duration: 15,
    energyLevel: "low",
    priority: "low",
    icon: Coffee,
    category: "Rest",
  },
];

interface TaskTemplatesProps {
  onSelectTemplate: (template: Omit<Task, "id">) => void;
}

export const TaskTemplates = ({ onSelectTemplate }: TaskTemplatesProps) => {
  const getEnergyColor = (level: TaskTemplate["energyLevel"]) => {
    switch (level) {
      case "high":
        return "bg-energy-high/20 text-energy-high border-energy-high/30";
      case "medium":
        return "bg-energy-medium/20 text-energy-medium border-energy-medium/30";
      case "low":
        return "bg-energy-low/20 text-energy-low border-energy-low/30";
    }
  };

  const getPriorityColor = (priority: TaskTemplate["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "medium":
        return "bg-accent/20 text-accent-foreground border-accent/30";
      case "low":
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-card">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-foreground mb-2">Quick Add Templates</h3>
        <p className="text-sm text-muted-foreground">
          Click any template to quickly add common tasks to your schedule
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <Button
              key={template.id}
              variant="outline"
              onClick={() =>
                onSelectTemplate({
                  title: template.title,
                  duration: template.duration,
                  energyLevel: template.energyLevel,
                  priority: template.priority,
                })
              }
              className="h-auto p-4 flex flex-col items-start gap-3 bg-secondary hover:bg-secondary/80 border-border hover:border-primary/50 transition-all group"
            >
              <div className="flex items-center gap-2 w-full">
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{template.category}</span>
              </div>
              
              <div className="w-full text-left">
                <h4 className="font-semibold text-foreground text-sm mb-2 group-hover:text-primary transition-colors">
                  {template.title}
                </h4>
                
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {template.duration}m
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getEnergyColor(template.energyLevel)}`}>
                    <Zap className="w-3 h-3 mr-1" />
                    {template.energyLevel}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${getPriorityColor(template.priority)}`}>
                    {template.priority}
                  </Badge>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </Card>
  );
};
