import type {
  AppSyncIdentityCognito,
  AppSyncIdentityIAM,
  AppSyncIdentityLambda,
  AppSyncIdentityOIDC,
  AppSyncResolverEvent,
} from "aws-lambda";

export const cognitoIdentity: AppSyncIdentityCognito = {
  sub: "user-sub",
  issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_example",
  username: "alice",
  claims: { email: "alice@example.com" },
  sourceIp: ["127.0.0.1"],
  defaultAuthStrategy: "ALLOW",
  groups: ["admin"],
};

export const oidcIdentity: AppSyncIdentityOIDC = {
  sub: "oidc-sub",
  issuer: "https://issuer.example.com",
  claims: { email: "bob@example.com" },
};

export const iamIdentity: AppSyncIdentityIAM = {
  accountId: "123456789012",
  cognitoIdentityPoolId: "us-east-1:pool-id",
  cognitoIdentityId: "us-east-1:identity-id",
  sourceIp: ["127.0.0.1"],
  username: "iam-user",
  userArn: "arn:aws:iam::123456789012:user/iam-user",
  cognitoIdentityAuthType: "authenticated",
  cognitoIdentityAuthProvider: "cognito-idp.amazonaws.com",
};

export const lambdaIdentity: AppSyncIdentityLambda = {
  resolverContext: { userId: "lambda-user-id" },
};

export interface BuildEventOptions {
  typeName?: string;
  fieldName?: string;
  args?: Record<string, unknown>;
  source?: Record<string, unknown> | null;
  identity?: AppSyncResolverEvent<unknown, unknown>["identity"];
  stash?: Record<string, unknown>;
}

export function mockResolverEvent(options: BuildEventOptions = {}) {
  const {
    typeName = "Query",
    fieldName = "getUser",
    args = { id: "user-1" },
    source = null,
    identity = cognitoIdentity,
    stash = {},
  } = options;

  return {
    arguments: args,
    source,
    identity,
    prev: null,
    request: {
      headers: {},
      domainName: null,
    },
    info: {
      parentTypeName: typeName,
      fieldName: fieldName,
      variables: {},
      selectionSetList: ["id", "name"],
      selectionSetGraphQL: "{ id name }",
    },
    stash,
  };
}

export function mockBatchResolverEvent(count = 2, options: BuildEventOptions = {}) {
  return Array.from({ length: count }, (_, i) =>
    mockResolverEvent({
      ...options,
      args: { ...(options.args ?? { id: `user-${i + 1}` }) },
      stash: { ...(options.stash ?? {}), index: i },
    })
  );
}
