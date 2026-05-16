export class GraphQLError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphQLError";
  }
}

export class Unauthorized extends GraphQLError {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedException";
  }
}
