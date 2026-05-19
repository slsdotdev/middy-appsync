import type {
  AppSyncIdentity,
  AppSyncIdentityCognito,
  AppSyncIdentityIAM,
  AppSyncIdentityLambda,
  AppSyncIdentityOIDC,
} from "aws-lambda";
import type { Authorization } from "./config.js";
import { hasProperty, isDefined, isRecord, isString } from "./typeGuards.js";

export type Identity = keyof Authorization extends never
  ? AppSyncIdentity
  : keyof Authorization extends infer K
    ? K extends string
      ? K extends "allow"
        ? K extends keyof Authorization
          ? Authorization[K] extends infer U
            ? U extends AppSyncIdentity
              ? U
              : AppSyncIdentity
            : AppSyncIdentity
          : AppSyncIdentity
        : AppSyncIdentity
      : AppSyncIdentity
    : AppSyncIdentity;

export function isOIDC(identity: AppSyncIdentity): identity is AppSyncIdentityOIDC {
  return (
    isDefined(identity) &&
    hasProperty(identity, "sub") &&
    isString(identity.sub) &&
    hasProperty(identity, "issuer") &&
    isString(identity.issuer) &&
    hasProperty(identity, "claims") &&
    isRecord(identity.claims)
  );
}

export function isCognito(identity: AppSyncIdentity): identity is AppSyncIdentityCognito {
  return (
    isOIDC(identity) &&
    hasProperty(identity, "username") &&
    isString(identity.username) &&
    hasProperty(identity, "groups") &&
    hasProperty(identity, "sourceIp") &&
    Array.isArray(identity.sourceIp) &&
    identity.sourceIp.every(isString)
  );
}

export function isIAM(identity: AppSyncIdentity): identity is AppSyncIdentityIAM {
  return (
    isDefined(identity) &&
    hasProperty(identity, "accountId") &&
    isString(identity.accountId) &&
    hasProperty(identity, "cognitoIdentityPoolId") &&
    isString(identity.cognitoIdentityPoolId) &&
    hasProperty(identity, "sourceIp") &&
    Array.isArray(identity.sourceIp) &&
    identity.sourceIp.every(isString) &&
    hasProperty(identity, "username") &&
    isString(identity.username)
  );
}

export function isLambda(identity: AppSyncIdentity): identity is AppSyncIdentityLambda {
  return (
    isDefined(identity) &&
    hasProperty(identity, "resolverContext") &&
    isRecord(identity.resolverContext)
  );
}

export function rule<TIdentity extends AppSyncIdentity>(
  predicate: (identity: TIdentity) => identity is TIdentity
) {
  return predicate;
}

// ---------------------------------------------------------------------------
// Rule combinators: compose multiple identity predicates with `and` / `or`.
// ---------------------------------------------------------------------------

type IdentityGuard<R extends Identity> = (identity: Identity) => identity is R;

/**
 * Compose identity predicates with logical AND. The returned guard passes only
 * when every rule passes, and narrows `identity` to the intersection of all
 * narrowed types.
 *
 * @example
 * ```ts
 * import { and, isCognito, rule } from "@middy-appsync/graphql";
 *
 * const isAdmin = rule((id: AppSyncIdentityCognito): id is AppSyncIdentityCognito =>
 *   id.groups?.includes("admin") ?? false
 * );
 *
 * const isCognitoAdmin = and(isCognito, isAdmin);
 * ```
 */
export function and(): IdentityGuard<Identity>;
export function and<R1 extends Identity>(r1: IdentityGuard<R1>): IdentityGuard<R1>;
export function and<R1 extends Identity, R2 extends Identity>(
  r1: IdentityGuard<R1>,
  r2: IdentityGuard<R2>
): IdentityGuard<R1 & R2>;
export function and<R1 extends Identity, R2 extends Identity, R3 extends Identity>(
  r1: IdentityGuard<R1>,
  r2: IdentityGuard<R2>,
  r3: IdentityGuard<R3>
): IdentityGuard<R1 & R2 & R3>;
export function and<
  R1 extends Identity,
  R2 extends Identity,
  R3 extends Identity,
  R4 extends Identity,
>(
  r1: IdentityGuard<R1>,
  r2: IdentityGuard<R2>,
  r3: IdentityGuard<R3>,
  r4: IdentityGuard<R4>
): IdentityGuard<R1 & R2 & R3 & R4>;
export function and(
  ...rules: ((identity: Identity) => boolean)[]
): (identity: Identity) => boolean {
  return (identity: Identity) => rules.every((r) => r(identity));
}

/**
 * Compose identity predicates with logical OR. The returned guard passes when
 * any rule passes, and narrows `identity` to the union of all narrowed types.
 *
 * @example
 * ```ts
 * import { or, isCognito, isIAM } from "@middy-appsync/graphql";
 *
 * const isCognitoOrIAM = or(isCognito, isIAM);
 * ```
 */
export function or(): IdentityGuard<never>;
export function or<R1 extends Identity>(r1: IdentityGuard<R1>): IdentityGuard<R1>;
export function or<R1 extends Identity, R2 extends Identity>(
  r1: IdentityGuard<R1>,
  r2: IdentityGuard<R2>
): IdentityGuard<R1 | R2>;
export function or<R1 extends Identity, R2 extends Identity, R3 extends Identity>(
  r1: IdentityGuard<R1>,
  r2: IdentityGuard<R2>,
  r3: IdentityGuard<R3>
): IdentityGuard<R1 | R2 | R3>;
export function or<
  R1 extends Identity,
  R2 extends Identity,
  R3 extends Identity,
  R4 extends Identity,
>(
  r1: IdentityGuard<R1>,
  r2: IdentityGuard<R2>,
  r3: IdentityGuard<R3>,
  r4: IdentityGuard<R4>
): IdentityGuard<R1 | R2 | R3 | R4>;
export function or(...rules: ((identity: Identity) => boolean)[]): (identity: Identity) => boolean {
  return (identity: Identity) => rules.some((r) => r(identity));
}
