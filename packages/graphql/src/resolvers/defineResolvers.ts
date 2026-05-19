import { AnyResolver } from "./createResolver.js";

/**
 * Helper function to define a list of resolvers with proper typing.
 * @param resolvers List of resolvers or arrays of resolvers to be flattened
 * @returns Flattened array of resolvers
 *
 * @example
 * ```ts
 * import { defineResolvers, mutation, object, query } from "@middy-appsync/graphql";
 *
 * const userQueries = query({
 *   getUser: () => ({ id: "123", name: "John Doe" }),
 * });
 *
 * const userMutations = mutation({
 *   createUser: ({ args: { input } }) => ({ id: input.id, name: input.name }),
 * });
 *
 * const userFields = object("User", {
 *   displayName: ({ source }) => source.name.toUpperCase(),
 * });
 *
 * export default defineResolvers(userQueries, userMutations, userFields);
 * ```
 */

export function defineResolvers(...resolvers: (AnyResolver | AnyResolver[])[]): AnyResolver[] {
  return resolvers.flat();
}
