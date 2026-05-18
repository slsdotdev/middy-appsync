export interface GraphQLResponse<T> {
  data?: T | null;
  errors?: { errorType?: string; message: string; path?: (string | number)[] }[];
}

export async function gql<T = Record<string, unknown>>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<GraphQLResponse<T>> {
  const url = process.env.GRAPHQL_URL;
  const apiKey = process.env.API_KEY;

  if (!url || !apiKey) {
    throw new Error("GRAPHQL_URL and API_KEY must be set (globalSetup should populate them).");
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`AppSync HTTP ${res.status}: ${await res.text()}`);
  }

  return (await res.json()) as GraphQLResponse<T>;
}
