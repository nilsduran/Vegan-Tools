export type CameraPermissionState = "granted" | "denied" | "prompt" | "unknown";

export async function getCameraPermissionState(): Promise<CameraPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }

  try {
    const permission = await navigator.permissions.query({ name: "camera" as PermissionName });
    return permission.state;
  } catch {
    return "unknown";
  }
}

export function isCameraPermissionError(error: unknown): boolean {
  return error instanceof DOMException && (
    error.name === "NotAllowedError" ||
    error.name === "PermissionDeniedError" ||
    error.name === "SecurityError"
  );
}
