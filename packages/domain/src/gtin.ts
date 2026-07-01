export function normalizeGtin(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidGtin(input: string): boolean {
  const gtin = normalizeGtin(input);
  if (![8, 12, 13, 14].includes(gtin.length)) return false;

  const digits = [...gtin].map(Number);
  const checkDigit = digits.pop();
  if (checkDigit === undefined) return false;

  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
}
