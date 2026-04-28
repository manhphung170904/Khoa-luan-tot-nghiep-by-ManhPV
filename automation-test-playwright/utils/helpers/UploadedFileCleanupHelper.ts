import fs from "node:fs/promises";
import path from "node:path";

type UploadedFileKind = "building" | "planning";

const moonNestRoot = path.resolve(process.cwd(), "..", "moonNest-main");

const uploadTargets: Record<UploadedFileKind, { dirs: string[]; allowedPattern: RegExp }> = {
  building: {
    dirs: [
      path.resolve(moonNestRoot, "target", "test-upload", "building_img"),
      path.resolve(moonNestRoot, "uploads", "building_img")
    ],
    allowedPattern: /^[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/i
  },
  planning: {
    dirs: [
      path.resolve(moonNestRoot, "target", "test-upload", "planning_map_img"),
      path.resolve(moonNestRoot, "uploads", "planning_map_img")
    ],
    allowedPattern: /^planning_[a-f0-9]{32}\.(jpg|jpeg|png|webp)$/i
  }
};

function extractSafeFilename(filename: string): string | null {
  const normalized = filename.trim().replace(/\\/g, "/");
  if (!normalized) {
    return null;
  }

  const base = path.posix.basename(normalized);
  if (!base || base === "." || base === "..") {
    return null;
  }

  return base;
}

export async function cleanupUploadedFileByName(kind: UploadedFileKind, filename?: string | null): Promise<void> {
  if (!filename) {
    return;
  }

  const safeFilename = extractSafeFilename(filename);
  const target = uploadTargets[kind];
  if (!safeFilename || !target.allowedPattern.test(safeFilename)) {
    return;
  }

  for (const dir of target.dirs) {
    const filePath = path.resolve(dir, safeFilename);
    if (path.dirname(filePath) !== dir) {
      continue;
    }

    await fs.rm(filePath, { force: true }).catch(() => {});
  }
}

export class UploadedFileCleanupRegistry {
  private readonly files: Array<{ kind: UploadedFileKind; filename?: string | null }> = [];

  add(kind: UploadedFileKind, filename?: string | null): void {
    this.files.push({ kind, filename });
  }

  async flush(): Promise<void> {
    while (this.files.length > 0) {
      const file = this.files.pop();
      if (file) {
        await cleanupUploadedFileByName(file.kind, file.filename);
      }
    }
  }
}
