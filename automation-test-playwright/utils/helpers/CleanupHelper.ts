export type CleanupTask = {
  label: string;
  action: () => Promise<unknown> | unknown;
};

type CleanupOptions = {
  throwOnError?: boolean;
  logPrefix?: string;
};

export class CleanupHelper {
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
