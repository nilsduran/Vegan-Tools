import { describe, expect, it } from "vitest";
import { EdgeClassifier } from "./edge-classifier.js";

describe("EdgeClassifier service", () => {
  it("gracefully reports not configured when model file is missing", () => {
    const classifier = new EdgeClassifier({
      modelPath: "non_existent_path.onnx",
      configPath: "non_existent_config.json",
    });

    expect(classifier.isConfigured()).toBe(false);
  });

  it("returns null when classifying without configured model", async () => {
    const classifier = new EdgeClassifier({
      modelPath: "non_existent_path.onnx",
      configPath: "non_existent_config.json",
    });

    const result = await classifier.classify("Tomato, salt, olive oil");
    expect(result).toBeNull();
  });
});
