type CleanupAction = () => Promise<void> | void;
type CleanupTask = CleanupAction | { label: string; action: CleanupAction };

export class ApiCleanupRegistry {
  private readonly tasks: CleanupTask[] = [];

  add(task: CleanupTask): void {
    this.tasks.push(task);
  }

  addLabeled(label: string, action: CleanupAction): void {
    this.add({ label, action });
  }

  addAll(tasks: CleanupTask[]): void {
    tasks.forEach((task) => this.add(task));
  }

  async flush(): Promise<void> {
    const errors: unknown[] = [];

    while (this.tasks.length > 0) {
      const task = this.tasks.pop();
      if (!task) {
        continue;
      }

      try {
        await this.runTask(task);
      } catch (error) {
        errors.push(error);
        const label = typeof task === "function" ? "anonymous cleanup task" : task.label;
        console.warn(`[API Cleanup Warning] ${label} failed:`, error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} API cleanup task(s) failed.`);
    }
  }

  private async runTask(task: CleanupTask): Promise<void> {
    if (typeof task === "function") {
      await task();
      return;
    }

    await task.action();
  }
}
