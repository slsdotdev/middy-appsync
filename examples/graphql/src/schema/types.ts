export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  body: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

export interface CreatePostInput {
  userId: string;
  title: string;
  body: string;
}
