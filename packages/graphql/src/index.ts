export {
  createResolver,
  createQueryResolver,
  createMutationResolver,
  createSubscriptionResolver,
  defineResolvers,

  /* Types */
  type Resolver,
  type AnyResolver,
  type ResolveHandler,
  type ResolverParams,
} from "./resolvers/index.js";

export { appSyncGraphQLRouter, type GraphQLRouterParams } from "./router/index.js";

export {
  isCognitoIdentity,
  isIAMIdentity,
  isLambdaIdentity,
  isOIDCIdentity,
  allowCognitoIdentity,
  allowIAMIdentity,
  allowLambdaIdentity,
  allowOIDCIdentity,
} from "./middleware/index.js";

export {
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
  isValidResolverEvent,
} from "./utils/index.js";
