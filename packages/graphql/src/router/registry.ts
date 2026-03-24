import { AnyResolver } from "../resolvers/index.js";

export function createRouterRegistry() {
  const registry = new Map<string, AnyResolver>();

  function register(resolver: AnyResolver) {
    const key = `${resolver.typeName}.${resolver.fieldName}`;
    registry.set(key, resolver);
  }

  function get(typeName: string, fieldName: string): AnyResolver | undefined {
    const key = `${typeName}.${fieldName}`;
    return registry.get(key);
  }

  return { register, get };
}
