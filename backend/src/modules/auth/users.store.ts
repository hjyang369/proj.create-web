export type PublicUser = {
  id: number;
  email: string;
  name: string;
};

export type StoredUser = PublicUser & {
  passwordHash: string;
};

export type UsersStore = {
  findByEmail: (email: string) => Promise<StoredUser | null>;
  create: (input: {
    email: string;
    name: string;
    passwordHash: string;
  }) => Promise<PublicUser>;
};

export const USERS_STORE = Symbol("USERS_STORE");
