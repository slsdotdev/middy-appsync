import { AppSyncResolverEvent } from "aws-lambda";
import { hasProperty, isRecord, isString } from "./typeGuards.js";
import { AnyIdentity } from "./auth.js";
import { DefinitionTypename, FieldArgs, FieldSource, ObjectFieldName } from "./definition.js";

export const isValidResolverEvent = (
  event: unknown
): event is AppSyncResolverEvent<unknown, unknown> => {
  if (!isRecord(event)) {
    return false;
  }

  return (
    isRecord(event.arguments) &&
    hasProperty(event, "source") &&
    hasProperty(event, "identity") &&
    hasProperty(event, "prev") &&
    isRecord(event.request) &&
    isRecord(event.info) &&
    isString(event.info.parentTypeName) &&
    isString(event.info.fieldName) &&
    isString(event.info.selectionSetGraphQL) &&
    Array.isArray(event.info.selectionSetList) &&
    event.info.selectionSetList.every(isString) &&
    isRecord(event.info.variables) &&
    isRecord(event.stash)
  );
};

export type AnyAppSyncResolverEvent = AppSyncResolverEvent<unknown, unknown>;
export type AnyAppSyncBatchResolverEvent = AnyAppSyncResolverEvent[];
export type AnyAppSyncResolverInputEvent = AnyAppSyncResolverEvent | AnyAppSyncBatchResolverEvent;

export type AnyAppSyncResolverLikeEvent = AnyAppSyncResolverInputEvent;

export function normalizeEvent<
  TTypeName extends string,
  TFieldName extends string,
  TSource extends Record<string, unknown> | null,
  TArgs extends Record<string, unknown>,
  TIdentity extends AnyIdentity,
>(
  event: AnyAppSyncResolverEvent
): TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity> {
  return {
    ...event,
    args: event.arguments,
    identity: event.identity ?? null,
  } as TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity>;
}

export interface TypedAppSyncResolverEvent<
  TTypeName extends string,
  TFieldName extends string,
  TSource extends Record<string, unknown> | null,
  TArgs extends Record<string, unknown>,
  TIdentity extends AnyIdentity,
> extends Omit<AppSyncResolverEvent<TArgs, TSource>, "identity"> {
  args: TArgs;
  identity: TIdentity;
  info: {
    parentTypeName: TTypeName;
    fieldName: TFieldName;
    selectionSetList: string[];
    selectionSetGraphQL: string;
    variables: Record<string, unknown>;
  };
}

export type ResolverEvent<
  TTypeName extends DefinitionTypename,
  TFieldName extends ObjectFieldName<TTypeName>,
  TSource extends FieldSource<TTypeName, TFieldName>,
  TArgs extends FieldArgs<TTypeName, TFieldName>,
  TIdentity extends AnyIdentity,
  TBatch extends boolean | undefined = undefined,
> = TBatch extends true
  ? TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity>[]
  : TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity>;
