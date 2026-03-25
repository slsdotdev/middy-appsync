export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

export const isNumber = (value: unknown): value is number => {
  return typeof value === "number";
};

export const isDefined = (value: unknown) => {
  return value !== undefined && value !== null;
};

export const hasProperty = <T extends object, K extends PropertyKey>(
  record: T,
  property: K
): record is T & Record<K, unknown> => {
  return Object.hasOwn(record, property);
};
