/**
 * Which Gemini models answer an image request right now (for diagnosing 503s).
 *   npx tsx scripts/probe-gemini.ts [model ...]
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";
import { GoogleGenAI } from "@google/genai";

const root = resolve(import.meta.dirname, "..");
config({ path: resolve(root, ".env"), quiet: true });
const common = execSync("git rev-parse --git-common-dir", { cwd: root }).toString().trim();
config({ path: resolve(root, common, "..", ".env"), quiet: true });

// A 1x1 white PNG.
const pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC";
const models = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.1-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
for (const model of models) {
  const started = Date.now();
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ inlineData: { mimeType: "image/png", data: pixel } }, { text: "Reply with the colour of this image in one word." }] }],
    });
    console.log(`${model.padEnd(24)} ok   ${Date.now() - started} ms  ${response.text?.trim().slice(0, 20)}`);
  } catch (error) {
    const status = (error as { status?: number }).status;
    console.log(`${model.padEnd(24)} FAIL ${status ?? ""} ${Date.now() - started} ms  ${String((error as Error).message).slice(0, 90)}`);
  }
}
