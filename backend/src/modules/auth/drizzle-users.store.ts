import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type AppDatabase,
} from "../../database/database.provider.js";
import { users } from "../../database/schema/users.js";
import type { PublicUser, StoredUser, UsersStore } from "./users.store.js";

@Injectable()
export class DrizzleUsersStore implements UsersStore {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: AppDatabase) {}

  async findByEmail(email: string): Promise<StoredUser | null> {
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  }

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<PublicUser> {
    const now = new Date();
    const [result] = await this.db.insert(users).values({
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: Number(result.insertId),
      email: input.email,
      name: input.name,
    };
  }
}
