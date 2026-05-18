import type { AppSyncResolverEvent } from "aws-lambda";
import type { DefinitionTypename, FieldArgs, FieldSource, ObjectFieldName } from "./definition.js";
import type { Identity } from "./auth.js";
import { hasProperty, isRecord, isString } from "./typeGuards.js";

export type AnyAppSyncResolverEvent = AppSyncResolverEvent<unknown, unknown>;
export type AnyAppSyncBatchResolverEvent = AnyAppSyncResolverEvent[];
export type AnyAppSyncResolverInputEvent = AnyAppSyncResolverEvent | AnyAppSyncBatchResolverEvent;

export type AnyAppSyncResolverLikeEvent = AnyAppSyncResolverInputEvent;

export interface TypedAppSyncResolverEvent<
  TTypeName extends string,
  TFieldName extends string,
  TSource extends Record<string, unknown> | null,
  TArgs extends Record<string, unknown>,
  TIdentity extends Identity,
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
  TIdentity extends Identity,
  TBatch extends boolean | undefined = undefined,
> = TBatch extends true
  ? TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity>[]
  : TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity>;

/**
 * Validates whether the provided event conforms to the structure of an AppSync resolver event.
 * @param event The event to validate.
 * @returns
 */

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
    isRecord(event.info.variables) &&
    isRecord(event.stash)
  );
};

/**
 * Normalizes an AppSync resolver event by ensuring it has the expected properties and types.
 * @param event A valid AppSync resolver event to normalize.
 * @returns
 */
export function normalizeEvent<
  TTypeName extends string,
  TFieldName extends string,
  TSource extends Record<string, unknown> | null,
  TArgs extends Record<string, unknown>,
  TIdentity extends Identity,
>(
  event: AnyAppSyncResolverEvent
): TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity> {
  return {
    ...event,
    args: event.arguments,
    identity: event.identity ?? null,
  } as TypedAppSyncResolverEvent<TTypeName, TFieldName, TSource, TArgs, TIdentity>;
}
