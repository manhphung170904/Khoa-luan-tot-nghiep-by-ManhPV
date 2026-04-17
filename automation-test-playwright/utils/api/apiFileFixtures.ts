import fs from "node:fs";
import path from "node:path";

export type MultipartFixture = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

const repoRoot = path.resolve(process.cwd(), "..");
const backendRoot = path.join(repoRoot, "moonNest-main");
const localFixtureRoot = path.join(process.cwd(), "test-data", "files");

const mimeTypeFor = (filePath: string): string => {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
};

const asMultipartFixture = (filePath: string, name = path.basename(filePath)): MultipartFixture => ({
  name,
  mimeType: mimeTypeFor(filePath),
  buffer: fs.readFileSync(filePath)
});

export const ApiFileFixtures = {
  backendBuildingImagePath(): string {
    return path.join(
      backendRoot,
      "src",
      "main",
      "resources",
      "static",
      "images",
      "building_img",
      "bitexco.jpg"
    );
  },

  backendPlanningMapImagePath(): string {
    return path.join(
      backendRoot,
      "src",
      "main",
      "resources",
      "static",
      "images",
      "planning_map_img",
      "map1.jpg"
    );
  },

  invalidTextPath(): string {
    return path.join(localFixtureRoot, "not-image.txt");
  },

  corruptJpgPath(): string {
    return path.join(localFixtureRoot, "corrupt-image.jpg");
  },

  buildingJpg(): MultipartFixture {
    return asMultipartFixture(this.backendBuildingImagePath());
  },

  planningMapJpg(): MultipartFixture {
    return asMultipartFixture(this.backendPlanningMapImagePath());
  },

  invalidText(): MultipartFixture {
    return asMultipartFixture(this.invalidTextPath());
  },

  corruptJpg(): MultipartFixture {
    return asMultipartFixture(this.corruptJpgPath());
  }
};
