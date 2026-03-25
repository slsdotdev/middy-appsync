import { AppSyncResolverEvent } from "aws-lambda";
import { hasProperty, isRecord, isString } from "./typeGuards.js";

export type AnyAppSyncResolverEvent = AppSyncResolverEvent<unknown, unknown>;
export type AnyAppSyncBatchResolverEvent = AnyAppSyncResolverEvent[];

export type AnyAppSyncResolverLikeEvent = AnyAppSyncResolverEvent | AnyAppSyncBatchResolverEvent;

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
