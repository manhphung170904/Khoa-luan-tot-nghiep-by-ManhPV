import devData from "./dev.json";
import localData from "./local.json";
import stagingData from "./staging.json";
import testData from "./test.json";

export type EnvironmentTestData = typeof localData;

export const environmentTestData: Record<"local" | "dev" | "test" | "staging", EnvironmentTestData> = {
  local: localData,
  dev: devData,
  test: testData,
  staging: stagingData
};
