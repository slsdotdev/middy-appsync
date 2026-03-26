// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SchemaDefinition {}

export type DefinitionObject = Record<string, FieldProps>;

export type DefinitionTypename = keyof SchemaDefinition extends never
  ? string
  : keyof SchemaDefinition;

export type ObjectFieldName<T extends DefinitionTypename> = keyof SchemaDefinition extends never
  ? string
  : T extends keyof SchemaDefinition
    ? keyof SchemaDefinition[T]
    : never;

export type FieldArgs<
  T extends DefinitionTypename,
  F extends ObjectFieldName<T>,
> = keyof SchemaDefinition extends never
  ? Record<string, unknown>
  : T extends keyof SchemaDefinition
    ? keyof SchemaDefinition[T] extends infer Fn
      ? Fn extends F
        ? SchemaDefinition[T][Fn] extends { args: infer A }
          ? A
          : never
        : never
      : never
    : never;

export type FieldResult<
  T extends DefinitionTypename,
  F extends ObjectFieldName<T>,
> = keyof SchemaDefinition extends never
  ? unknown
  : T extends keyof SchemaDefinition
    ? keyof SchemaDefinition[T] extends infer Fn
      ? Fn extends F
        ? SchemaDefinition[T][Fn] extends { result: infer R }
          ? R
          : never
        : never
      : never
    : never;

export type FieldSource<
  T extends DefinitionTypename,
  F extends ObjectFieldName<T>,
> = keyof SchemaDefinition extends never
  ? Record<string, unknown> | null
  : T extends keyof SchemaDefinition
    ? keyof SchemaDefinition[T] extends infer Fn
      ? Fn extends F
        ? SchemaDefinition[T][Fn] extends { source: infer S }
          ? S
          : never
        : never
      : never
    : never;

export type ValueType =
  | string
  | number
  | boolean
  | null
  | { [key: string]: ValueType }
  | ValueType[];

export interface FieldProps {
  args: Record<string, ValueType>;
  result: ValueType;
  source?: ValueType;
}
