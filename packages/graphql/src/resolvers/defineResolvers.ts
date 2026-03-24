import { AnyResolver } from "./createResolver.js";

/**
 * Helper function to define a list of resolvers with proper typing.
 * @param resolvers List of resolvers or arrays of resolvers to be flattened
 * @returns Flattened array of resolvers
 *
 * @example
 * ```ts
 * import { defineResolvers, createQueryResolver } from "@middy-appsync/graphql";
 *
 * const getUser = createQueryResolver({
 *   fieldName: "getUser",
 *   resolve: () => {
 *     return {
 *       id: "123",
 *       name: "John Doe",
 *     };
 *   },
 * });
 *
 * const createUser = createMutationResolver({
 *   fieldName: "createUser",
 *   resolve: ({ args: { input } }) => {
 *     return {
 *       id: input.id,
 *       name: input.name,
 *     };
 *   },
 * });
 *
 * export default defineResolvers(getUser, createUser);
 * ```
 */

export function defineResolvers<T extends AnyResolver>(...resolvers: (T | T[])[]): T[] {
  return resolvers.flat() as T[];
}
