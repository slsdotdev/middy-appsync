import { AppSyncResolverEvent } from "aws-lambda";

export const isRecordObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const isValidGraphQLEvent = (
  event: unknown
): event is AppSyncResolverEvent<unknown, unknown> => {
  if (!isRecordObject(event)) {
    return false;
  }

  return (
    isRecordObject(event.arguments) &&
    Object.hasOwn(event, "source") &&
    Object.hasOwn(event, "identity") &&
    Object.hasOwn(event, "prev") &&
    isRecordObject(event.request) &&
    isRecordObject(event.info) &&
    typeof event.info.parentTypeName === "string" &&
    typeof event.info.fieldName === "string" &&
    Array.isArray(event.info.selectionSetList) &&
    typeof event.info.selectionSetGraphQL === "string" &&
    isRecordObject(event.info.variables) &&
    isRecordObject(event.stash)
  );
};
