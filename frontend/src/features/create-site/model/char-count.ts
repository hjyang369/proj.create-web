export const INPUT_MAX_LENGTH = 100;
export const TEXTAREA_MAX_LENGTH = 500;

export type CharCount = {
  count: number;
  max: number;
  label: string;
  exceeded: boolean;
};

export function describeCharCount(value: string, max: number): CharCount {
  const count = value.length;

  return {
    count,
    max,
    label: `${count} / ${max}`,
    exceeded: count > max,
  };
}
