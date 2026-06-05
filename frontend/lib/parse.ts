const MISSING_VALUES = new Set(["NA", "na", "-"]);

function numericTokens(text: string): string[] {
  return text
    .split(/[\n,\t\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseNumber(token: string): number {
  const value = Number(token);
  if (!Number.isFinite(value)) {
    throw new Error(`数値として解釈できない値があります: ${token}`);
  }
  return value;
}

export function parseNumbers(text: string): number[] {
  return numericTokens(text).map(parseNumber);
}

export function parseNullableNumbers(text: string): (number | null)[] {
  return numericTokens(text).map((token) =>
    MISSING_VALUES.has(token) ? null : parseNumber(token)
  );
}

export function parseCategoricalValues(text: string): (string | null)[] {
  return text
    .split(/[\n,\t,]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => (MISSING_VALUES.has(token) ? null : token));
}

export function parseIntegerMatrix(text: string): number[][] {
  return text
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const values = parseNumbers(row);
      if (values.some((value) => !Number.isInteger(value))) {
        throw new Error("クロス集計表には整数を入力してください。");
      }
      return values;
    });
}
