# @middy-appsync/graphql

Lambda router and tools for AWS AppSync GraphQL using [Middy.js](https://middy.js.org) middleware.

```bash
npm install @middy-appsync/graphql @middy/core
```

Peer dependency: `@middy/core >= 7`.

## At a glance

```ts
// resolvers/users.ts
import { mutation, query } from "@middy-appsync/graphql";

export const userQueries = query({
  getUser: async ({ args: { id } }) => loadUser(id),
  listUsers: async () => listAllUsers(),
});

export const userMutations = mutation({
  createUser: async ({ args: { input } }) => createUserRecord(input),
});
```

```ts
// resolvers/index.ts
import { defineResolvers } from "@middy-appsync/graphql";
import { userMutations, userQueries } from "./users.js";

export const resolvers = defineResolvers(userQueries, userMutations);
```

```ts
// lambda/execute.ts
import middy from "@middy/core";
import { appSyncGraphQLRouter } from "@middy-appsync/graphql";
import { resolvers } from "../resolvers/index.js";

export const handler = middy(appSyncGraphQLRouter({ resolvers }));
```

The router dispatches each incoming AppSync event to the resolver that matches
`event.info.parentTypeName` + `event.info.fieldName`. Batch events go to a
matching batch resolver; if none is registered the router falls back to
`fallbackResolver` (default: `() => null`).

A full end-to-end CRUD example (schema, resolvers, CDK) lives in
[`examples/graphql/`](../../examples/graphql).

---

## Router

### `appSyncGraphQLRouter(params)`

Builds a Lambda handler that registers the supplied resolvers and dispatches
incoming events to them.

```ts
function appSyncGraphQLRouter(params: GraphQLRouterParams): AppSyncGraphQLResolverHandler;
```

Behavior:

- Looks up a resolver by `event.info.parentTypeName` and `event.info.fieldName`.
- Single events go to single resolvers; array (batch) events go to batch
  resolvers. A mismatch (e.g. a batch event with no batch resolver registered)
  routes through `fallbackResolver`.
- Errors thrown inside a resolver are returned to AppSync as a formatted error
  result (the handler does not crash the Lambda).
- Invalid event shapes throw with a descriptive message.

### `GraphQLRouterParams`

| Field              | Type              | Description                                                                       |
| ------------------ | ----------------- | --------------------------------------------------------------------------------- |
| `resolvers`        | `AnyResolver[]`   | Flat array of resolvers returned by `resolver` / `object` / `query` / `mutation`. |
| `fallbackResolver` | `ResolveHandler?` | Optional handler used when no resolver matches. Defaults to `() => null`.         |

The returned handler is a Middy-friendly Lambda handler — wrap it with
`middy(...)` to attach cross-cutting middleware (logging, tracing, error
mapping):

```ts
export const handler = middy(appSyncGraphQLRouter({ resolvers })).use({
  before: (req) => console.log("event", req.event),
});
```

---

## Resolvers

### `resolver(params)`

Low-level builder for a single field's resolver. Provide exactly one of
`resolve` (single-event) or `batchResolve` (batched) — never both.

```ts
import { resolver, isCognito } from "@middy-appsync/graphql";

export const getUser = resolver({
  typeName: "Query",
  fieldName: "getUser",
  authorize: isCognito, // optional — attaches withAuthorization
  resolve: async ({ args }) => loadUser(args.id),
});

export const userPosts = resolver({
  typeName: "User",
  fieldName: "posts",
  batchResolve: async (events) =>
    Promise.all(events.map(({ source }) => loadPostsByUser(source.id))),
});
```

The returned resolver exposes Middy's `.use(middleware)`:

```ts
getUser.use({ before: (req) => console.log(req.event) });
```

When `authorize` is provided, a `withAuthorization(predicate)` middleware is
attached automatically and runs before any user-added middleware. The
predicate is a type guard, so `event.identity` is narrowed to `TIdentity`
inside `resolve` / `batchResolve`.

### `object(typeName, fields)`

Bulk builder. Returns an array of resolvers, one per field. Each field value
is either a bare resolve function or an options object:

```ts
import { object } from "@middy-appsync/graphql";

export const userFields = object("User", {
  displayName: async ({ source }) => source.name.toUpperCase(),
  posts: {
    batchResolve: async (events) =>
      Promise.all(events.map(({ source }) => loadPostsByUser(source.id))),
  },
});
```

### `query(fields)` / `mutation(fields)` / `subscription(fields)`

Sugar over `object("Query" | "Mutation" | "Subscription", fields)`.

```ts
import { mutation, query } from "@middy-appsync/graphql";

export const userQueries = query({
  getUser: async ({ args: { id } }) => loadUser(id),
});

export const userMutations = mutation({
  createUser: async ({ args: { input } }) => createUserRecord(input),
});
```

> Per-field `authorize` in the options form does **not** narrow `identity`
> inside `resolve` (mapped types can't carry per-key generics). For
> per-field identity narrowing, reach for `resolver(...)` instead.

### `defineResolvers(...resolvers)`

Flattens any mix of single resolvers and resolver arrays into one array
ready for the router.

```ts
import { defineResolvers } from "@middy-appsync/graphql";

export const resolvers = defineResolvers(userQueries, userMutations, userFields);
```

### `isBatchResolver(resolver)`

Type guard. Returns `true` when `resolver.batch === true` and narrows to
`AnyBatchResolver`.

### Resolver types

| Type                                                | Purpose                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `Resolver<TType, TField, TSource, TArgs, TResult, TIdentity, TBatch>` | Fully-typed resolver returned by `resolver(...)`. Exposes `.use(...)` and `.handler`. |
| `AnyResolver`                                       | Any single or batch resolver — what the router accepts.                              |
| `AnyBatchResolver`                                  | Batch resolver (`batch === true`).                                                   |
| `ResolveHandler`                                    | Single-event resolve function signature.                                             |
| `BatchResolveHandler`                               | Batch resolve function signature (array in, array out, same order).                  |
| `ResolverParams`                                    | Parameter type accepted by the low-level `resolver(...)` / `createResolver`.         |
| `FieldParams`                                       | Discriminated union of `SingleFieldParams \| BatchFieldParams`.                      |
| `SingleFieldParams`                                 | `resolver(...)` params with `resolve`.                                               |
| `BatchFieldParams`                                  | `resolver(...)` params with `batchResolve`.                                          |
| `FieldResolverOptions`                              | Per-field options shape accepted by `object` / `query` / `mutation` / `subscription`.|
| `FieldResolverEntry`                                | A bare resolve function **or** `FieldResolverOptions` — the value type in `fields`.  |
| `ObjectFieldsMap<TTypeName>`                        | Shape of the `fields` argument passed to the bulk builders.                          |

---

## Authorization middleware

### `withAuthorization(authorize)`

Generic Middy middleware. Throws `Unauthorized` when the predicate returns
`false`. For a batch event, the entire batch is rejected if any entry fails.

```ts
import { withAuthorization, isCognito, resolver } from "@middy-appsync/graphql";

resolver({
  typeName: "Query",
  fieldName: "me",
  resolve: ({ identity }) => loadUser(identity.username),
}).use(withAuthorization(isCognito));
```

### `allowCognitoIdentity()` / `allowIAMIdentity()` / `allowLambdaIdentity()` / `allowOIDCIdentity()`

Convenience wrappers around `withAuthorization` paired with the matching
identity predicate:

```ts
import { allowCognitoIdentity, resolver } from "@middy-appsync/graphql";

resolver({
  typeName: "Query",
  fieldName: "me",
  resolve: ({ identity }) => loadUser(identity.username),
}).use(allowCognitoIdentity());
```

---

## Errors

### `GraphQLError`

Base error class. AppSync surfaces errors of this class with the proper shape
for GraphQL responses.

```ts
import { GraphQLError, query } from "@middy-appsync/graphql";

class NotFoundError extends GraphQLError {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export const userQueries = query({
  getUser: ({ args }) => {
    throw new NotFoundError(`User ${args.id} not found`);
  },
});
```

### `Unauthorized`

Subclass of `GraphQLError`. Its `name` is set to `"UnauthorizedException"`.
Thrown automatically by `withAuthorization` (and therefore by the
`allow*Identity` middlewares and by `resolver({ authorize })`).

```ts
new Unauthorized();             // message: "Unauthorized"
new Unauthorized("Forbidden");  // custom message
```

---

## Identity predicates & combinators

### `isCognito` / `isIAM` / `isLambda` / `isOIDC`

Type guards over `AppSyncIdentity` that narrow to the corresponding identity
type (`AppSyncIdentityCognito`, `AppSyncIdentityIAM`,
`AppSyncIdentityLambda`, `AppSyncIdentityOIDC`).

```ts
import { isCognito, resolver } from "@middy-appsync/graphql";

resolver({
  typeName: "Query",
  fieldName: "me",
  authorize: isCognito,
  resolve: ({ identity }) => loadUser(identity.username), // typed as Cognito identity
});
```

### `rule(predicate)`

Identity-function helper that lets TypeScript infer the predicate's narrowed
type without `as` casts. Returns the predicate unchanged.

```ts
import { rule } from "@middy-appsync/graphql";
import type { AppSyncIdentityCognito } from "aws-lambda";

export const isAdmin = rule(
  (id: AppSyncIdentityCognito): id is AppSyncIdentityCognito =>
    id.groups?.includes("admin") ?? false
);
```

### `and(...rules)` / `or(...rules)`

Compose identity guards. `and` passes only when every rule passes, narrowing
to the intersection of the narrowed types. `or` passes when any rule passes,
narrowing to the union. Both are overloaded for 0–4 arguments.

```ts
import { and, or, isCognito, isIAM } from "@middy-appsync/graphql";

const isCognitoAdmin = and(isCognito, isAdmin);
const isCognitoOrIAM = or(isCognito, isIAM);
```

---

## Type exports

| Type                              | Use case                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| `ResolverResult`                  | Shape returned by the router for a single event (data, error, stash).                  |
| `Authorization`                   | Module-augmentation hook used to constrain `Identity` to a specific identity type.     |
| `Definition`                      | Module-augmentation hook for typing your GraphQL schema (types, fields, args, results).|
| `DefinitionObject`                | Type that describes a single GraphQL object (`Query`, `Mutation`, user types, …).      |
| `DefinitionTypename`              | Union of declared type names (or `string` when `Definition` is not extended).          |
| `ObjectFieldName<TTypeName>`      | Field names available on a given type.                                                 |
| `FieldArgs<TTypeName, TField>`    | Args for a given type/field.                                                           |
| `FieldResult<TTypeName, TField>`  | Result type for a given type/field.                                                    |
| `FieldSource<TTypeName, TField>`  | Source (parent) type for a given type/field.                                           |
| `ValueType`                       | The base recognized scalar/value union the type helpers build on.                      |
| `FieldProps`                      | Internal field descriptor used by the definition types.                                |
| `AnyAppSyncResolverLikeEvent`     | Union of a single resolver event and a batch (array) of them — what the router accepts.|
| `AnyAppSyncBatchResolverEvent`    | Array form of an AppSync resolver event.                                               |
| `AnyAppSyncResolverEvent`         | Single AppSync resolver event (any type/field).                                        |
| `AnyAppSyncResolverInputEvent`    | Raw input event shape accepted before normalization.                                   |
| `TypedAppSyncResolverEvent`       | Resolver event narrowed by type/field/source/args/identity — used in resolver handlers.|

---

## License

MIT
