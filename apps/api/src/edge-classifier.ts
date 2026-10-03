/**
 * @file edge-classifier.ts
 * @description ONNX Runtime local edge inference engine for multilingual dietary classification.
 * Runs INT8-quantized transformer models directly on CPU in <15ms with zero external API calls.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ort from "onnxruntime-node";
import { AutoTokenizer } from "@huggingface/transformers";
import { splitTraces, type DietVerdict } from "@vegan-tools/domain";

export interface DecisionConfig {
  model_name: string;
  thresholds: {
    slaughter: number;
    secretion: number;
    dual_origin: number;
  };
  labels_map?: Record<string, string>;
}

export interface EdgeClassificationResult {
  verdict: DietVerdict;
  probabilities: {
    slaughter: number;
    secretion: number;
    dual_origin: number;
  };
  latencyMs: number;
  engine: "edge_onnx_int8";
  traces: string[];
}

export class EdgeClassifier {
  private session: ort.InferenceSession | null = null;
  private tokenizer: any = null;
  private config: DecisionConfig | null = null;
  private modelPath: string;
  private configPath: string;
  private isInitializing: Promise<void> | null = null;

  constructor(options: { modelPath?: string; configPath?: string } = {}) {
    const projectRoot = resolve(process.cwd(), "../..");
    this.modelPath =
      options.modelPath ||
      resolve(projectRoot, "data/models/vegan_classifier_int8.onnx");
    this.configPath =
      options.configPath ||
      resolve(projectRoot, "data/models/decision_config.json");
  }

  public isConfigured(): boolean {
    return existsSync(this.modelPath) && existsSync(this.configPath);
  }

  public async initialize(): Promise<boolean> {
    if (this.session) return true;
    if (!this.isConfigured()) return false;

    if (!this.isInitializing) {
      this.isInitializing = (async () => {
        try {
          const configRaw = readFileSync(this.configPath, "utf-8");
          this.config = JSON.parse(configRaw) as DecisionConfig;

          // Inicialitzem sessió ONNX Runtime en CPU
          this.session = await ort.InferenceSession.create(this.modelPath, {
            executionProviders: ["cpu"],
            graphOptimizationLevel: "all",
          });

          // Inicialitzem tokenizer HuggingFace
          const modelId = this.config.model_name || "distilbert/distilbert-base-multilingual-cased";
          this.tokenizer = await AutoTokenizer.from_pretrained(modelId);
        } catch (error) {
          console.warn("[EdgeClassifier] No s'ha pogut carregar el model ONNX:", error);
          this.session = null;
          this.tokenizer = null;
        } finally {
          this.isInitializing = null;
        }
      })();
    }

    await this.isInitializing;
    return this.session !== null;
  }

  public async classify(text: string): Promise<EdgeClassificationResult | null> {
    if (!this.session || !this.tokenizer || !this.config) {
      const initialized = await this.initialize();
      if (!initialized || !this.session || !this.tokenizer || !this.config) {
        return null;
      }
    }

    const t0 = performance.now();
    const { ingredients, traces } = splitTraces(text);

    // Tokenització
    const encoded = await this.tokenizer(ingredients, {
      truncation: true,
      max_length: 96,
      padding: true,
      return_tensor: false,
    });

    const inputIds = BigInt64Array.from(encoded.input_ids.map((x: number) => BigInt(x)));
    const attentionMask = BigInt64Array.from(encoded.attention_mask.map((x: number) => BigInt(x)));
    const seqLen = encoded.input_ids.length;

    const feeds: Record<string, ort.Tensor> = {
      input_ids: new ort.Tensor("int64", inputIds, [1, seqLen]),
      attention_mask: new ort.Tensor("int64", attentionMask, [1, seqLen]),
    };

    const output = await this.session.run(feeds);
    const logitsTensor = output.logits ?? Object.values(output)[0];
    if (!logitsTensor) {
      return null;
    }
    const logits = logitsTensor.data as Float32Array;
    const l0 = logits[0] ?? 0;
    const l1 = logits[1] ?? 0;
    const l2 = logits[2] ?? 0;

    // Sigmoide per a cada sortida
    const slaughterProb = 1.0 / (1.0 + Math.exp(-l0));
    const secretionProb = 1.0 / (1.0 + Math.exp(-l1));
    const dualProb = 1.0 / (1.0 + Math.exp(-l2));

    const { thresholds } = this.config;
    let verdict: DietVerdict = "vegan";

    if (slaughterProb >= thresholds.slaughter) {
      verdict = "non_vegetarian";
    } else if (secretionProb >= thresholds.secretion) {
      verdict = "vegetarian";
    } else if (dualProb >= thresholds.dual_origin) {
      verdict = "probably_vegetarian";
    } else {
      verdict = "vegan";
    }

    const latencyMs = performance.now() - t0;

    return {
      verdict,
      probabilities: {
        slaughter: slaughterProb,
        secretion: secretionProb,
        dual_origin: dualProb,
      },
      latencyMs,
      engine: "edge_onnx_int8",
      traces,
    };
  }
}

export const globalEdgeClassifier = new EdgeClassifier();
