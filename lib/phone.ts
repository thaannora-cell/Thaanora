// Saudi mobile numbers: 05XXXXXXXX, 5XXXXXXXX, 9665XXXXXXXX or +9665XXXXXXXX → +9665XXXXXXXX.
export function normaliseSaudiMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "").replace(/^00/, "");
  const local = digits.startsWith("966") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return /^5\d{8}$/.test(local) ? `+966${local}` : null;
}
