export function isPresentableMenuSource(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/");
}
