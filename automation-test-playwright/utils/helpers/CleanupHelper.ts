export type CleanupTask = {
  label: string;
  action: () => Promise<unknown> | unknown;
};

export type CleanupRegistryLike = {
  addLabeled(label: string, action: () => Promise<unknown> | unknown): void;
};

type CleanupOptions = {
  throwOnError?: boolean;
  logPrefix?: string;
};

export class CleanupHelper {
  static register(registry: CleanupRegistryLike, tasks: CleanupTask[]): void {
    for (const task of tasks) {
      registry.addLabeled(task.label, task.action);
    }
  }

  static async run(tasks: CleanupTask[], options: CleanupOptions = {}): Promise<void> {
    const errors: unknown[] = [];
    const logPrefix = options.logPrefix ?? "[Cleanup Warning]";

    for (const task of tasks) {
      try {
        await task.action();
      } catch (error) {
        errors.push(error);
        console.warn(`${logPrefix} ${task.label} failed:`, error);
      }
    }

    if ((options.throwOnError ?? true) && errors.length > 0) {
      throw new AggregateError(errors, `${errors.length} cleanup task(s) failed.`);
    }
  }
}
