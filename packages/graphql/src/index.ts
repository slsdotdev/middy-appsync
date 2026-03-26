export {
  createResolver,
  createQueryResolver,
  createMutationResolver,
  createSubscriptionResolver,
  defineResolvers,
  isBatchResolver,

  /* Types */
  type Resolver,
  type AnyResolver,
  type ResolveHandler,
  type ResolverParams,
  type BatchResolveHandler,
} from "./resolvers/index.js";

export { appSyncGraphQLRouter, type GraphQLRouterParams } from "./router/index.js";

export {
  allowCognitoIdentity,
  allowIAMIdentity,
  allowLambdaIdentity,
  allowOIDCIdentity,
} from "./middleware/index.js";

export {
  isValidResolverEvent,
  isCognito,
  isIAM,
  isLambda,
  isOIDC,
  type SchemaDefinition,
  type DefinitionObject,
  type DefinitionTypename,
  type ObjectFieldName,
  type FieldArgs,
  type FieldResult,
  type FieldSource,
  type ValueType,
  type FieldProps,
  type AnyAppSyncResolverLikeEvent,
  type AnyAppSyncBatchResolverEvent,
  type AnyAppSyncResolverEvent,
  type AnyAppSyncResolverInputEvent,
  type AnyIdentity,
  type TypedAppSyncResolverEvent,
} from "./utils/index.js";
