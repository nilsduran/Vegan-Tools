const baseUrl = (process.env.API_URL ?? "http://localhost:3001").replace(/\/+$/, "");

async function check(path, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status !== expectedStatus) {
    const body = await response.text();
    throw new Error(`${path} returned ${response.status}; expected ${expectedStatus}: ${body.slice(0, 300)}`);
  }
  if (path === "/health" && (await response.text()) !== "ok") {
    throw new Error("/health did not return the expected body.");
  }
  console.log(`✓ ${path} (${response.status})`);
}

await check("/health", 200);
await check("/", 200);
console.log(`API smoke test passed for ${baseUrl}`);
