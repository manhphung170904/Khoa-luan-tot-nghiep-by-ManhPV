import type { TestInfo } from "@playwright/test";

type TestMetadata = {
  testId?: string;
  layer?: "API" | "E2E" | "UI" | "UNKNOWN";
  actor?: string;
  feature?: string;
};

function parseTestMetadata(title: string): TestMetadata {
  const testId = title.match(/^\[([^\]]+)\]/)?.[1];
  const normalizedTitle = title.replace(/^\[[^\]]+\]\s*-\s*/, "");
  const segments = normalizedTitle.split(" - ").map((item) => item.trim()).filter(Boolean);
  const layerMatch = normalizedTitle.match(/\b(API|E2E|UI)\b/i)?.[1]?.toUpperCase();

  return {
    testId,
    layer: layerMatch === "API" || layerMatch === "E2E" || layerMatch === "UI" ? layerMatch : "UNKNOWN",
    actor: segments[0]?.replace(/^(API|E2E|UI)\s+/i, ""),
    feature: segments[1]
  };
}

export function annotateTestMetadata(testInfo: TestInfo): void {
  const metadata = parseTestMetadata(testInfo.title);
  const annotations = [
    ["testId", metadata.testId],
    ["layer", metadata.layer],
    ["actor", metadata.actor],
    ["feature", metadata.feature]
  ] as const;

  for (const [type, description] of annotations) {
    if (!description) {
      continue;
    }

    testInfo.annotations.push({ type, description });
  }
}
