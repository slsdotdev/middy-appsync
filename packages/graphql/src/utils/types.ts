import type { AppSyncIdentity, AppSyncResolverEventHeaders } from "aws-lambda";
import type { Context as LambdaContext } from "aws-lambda";
import type { MiddlewareObj, MiddyfiedHandler } from "@middy/core";

export type OutputType =
  | string
  | number
  | boolean
  | null
  | { [key: string]: OutputType }
  | OutputType[];

// =============================================
// Module augmentation interfaces
// =============================================

/**
 * Hierarchical resolver map. Users augment this via `declare module`.
 *
 * ```ts
 * declare module "@middy-appsync/graphql" {
 *   interface SchemaDefinition {
 *     Query: {
 *       getUser: { args: { id: string }; result: User };
 *     };
 *     User: {
 *       posts: { args: {}; result: Post[]; source: User };
 *     };
 *   }
 * }
 * ```
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SchemaDefinition {}

export type KeyOfRoot = keyof SchemaDefinition extends infer K ? K : never;

export type IsString = KeyOfRoot extends never ? false : true;

/**
 * Custom fields available on the Lambda context in all resolvers.
 * Users augment this via `declare module`.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ResolverContext {}

// =============================================
// Utility types
// =============================================

export type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

// =============================================
// Schema utility types
// =============================================

export type TypeName = keyof SchemaDefinition;

export type FieldName<T extends TypeName> = keyof SchemaDefinition[T];

export type ResolverEntry<
  T extends TypeName,
  F extends string,
> = F extends keyof SchemaDefinition[T] ? SchemaDefinition[T][F] : never;

/** Flat `"TypeName.fieldName"` union derived from the hierarchical map. */
export type ResolverKey = {
  [T in TypeName]: {
    [F in FieldName<T>]: F extends string ? `${T}.${F}` : never;
  }[FieldName<T>];
}[TypeName];

// =============================================
// Auth middleware types
// =============================================

/**
 * An auth middleware that carries a phantom type declaring
 * what scopes it guarantees at runtime on `event.identity.scopes`.
 */
export interface AuthMiddleware<
  TScopes extends Record<string, unknown> = Record<string, never>,
> extends MiddlewareObj {
  /** Phantom type — never set at runtime, only read by the type system. */
  __scopes?: TScopes;
}

/** Intersect all scope types from a tuple of auth middleware. */
export type MergeScopes<A extends AuthMiddleware<Record<string, unknown>>[]> = A extends []
  ? Record<string, never>
  : UnionToIntersection<A[number] extends AuthMiddleware<infer S> ? S : never>;

// =============================================
// Identity types
// =============================================

/**
 * When auth middleware is present, identity is guaranteed non-null
 * and carries a typed `scopes` object. Otherwise, standard AppSync identity.
 */
export type ResolverIdentity<S extends Record<string, unknown>> = [keyof S] extends [never]
  ? AppSyncIdentity
  : NonNullable<AppSyncIdentity> & { scopes: S };

// =============================================
// Event type
// =============================================

export interface TypedAppSyncEvent<
  T extends TypeName,
  F extends string,
  S extends Record<string, unknown> = Record<string, never>,
> {
  arguments: ResolverEntry<T, F> extends { args: infer A } ? A : never;
  source: ResolverEntry<T, F> extends { source: infer Src } ? Src : null;
  identity: ResolverIdentity<S>;
  info: {
    parentTypeName: T;
    fieldName: F;
    selectionSetList: string[];
    selectionSetGraphQL: string;
    variables: Record<string, unknown>;
  };
  stash: Record<string, unknown>;
  request: {
    headers: AppSyncResolverEventHeaders;
    domainName: string | null;
  };
  prev: { result: Record<string, unknown> } | null;
}

// =============================================
// Resolve function & resolver object
// =============================================

type PromiseOrValue<T> = T | Promise<T>;

type ResolverOutput<T extends TypeName, F extends string> =
  ResolverEntry<T, F> extends { result: infer R } ? R : never;

export type ResolveFunction<
  T extends TypeName,
  F extends string,
  S extends Record<string, unknown> = Record<string, never>,
> = (
  event: TypedAppSyncEvent<T, F, S>,
  context: LambdaContext & ResolverContext
) => PromiseOrValue<ResolverOutput<T, F>>;

export interface Resolver<T extends TypeName = TypeName, F extends string = string> {
  typeName: T;
  fieldName: F;
  handler: MiddyfiedHandler;
  use: (middleware: MiddlewareObj) => Resolver<T, F>;
}
