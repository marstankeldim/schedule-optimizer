import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Dependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
}

export const useTaskDependencies = (userId: string | undefined) => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);

  useEffect(() => {
    if (!userId) return;

    loadDependencies();
  }, [userId]);

  const loadDependencies = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("task_dependencies")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading dependencies:", error);
    } else {
      setDependencies(data || []);
    }
  };

  const getTaskDependencies = (taskId: string): string[] => {
    return dependencies
      .filter((dep) => dep.task_id === taskId)
      .map((dep) => dep.depends_on_task_id);
  };

  const getDependentTasks = (taskId: string): string[] => {
    return dependencies
      .filter((dep) => dep.depends_on_task_id === taskId)
      .map((dep) => dep.task_id);
  };

  const hasUnmetDependencies = (taskId: string, completedTaskIds: string[]): boolean => {
    const deps = getTaskDependencies(taskId);
    return deps.some((depId) => !completedTaskIds.includes(depId));
  };

  return {
    dependencies,
    getTaskDependencies,
    getDependentTasks,
    hasUnmetDependencies,
    reload: loadDependencies,
  };
};
