export interface FormatDateOptions {
  showTime?: boolean;
}

export function formatDate(
  value: string | number | Date | null | undefined,
  options?: FormatDateOptions
): string;
