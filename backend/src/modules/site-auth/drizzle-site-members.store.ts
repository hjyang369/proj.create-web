import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import {
  DATABASE_TOKEN,
  type AppDatabase,
} from "../../database/database.provider.js";
import { siteMembers } from "../../database/schema/site-members.js";
import { sites } from "../../database/schema/sites.js";
import type {
  PublicSiteMember,
  SiteMembersStore,
  StoredSiteMember,
} from "./site-members.store.js";

@Injectable()
export class DrizzleSiteMembersStore implements SiteMembersStore {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: AppDatabase) {}

  async siteExists(siteId: number): Promise<boolean> {
    const [site] = await this.db
      .select({ id: sites.id })
      .from(sites)
      .where(eq(sites.id, siteId))
      .limit(1);

    return site !== undefined;
  }

  async findBySiteAndEmail(
    siteId: number,
    email: string,
  ): Promise<StoredSiteMember | null> {
    const [member] = await this.db
      .select({
        id: siteMembers.id,
        siteId: siteMembers.siteId,
        email: siteMembers.email,
        name: siteMembers.name,
        passwordHash: siteMembers.passwordHash,
      })
      .from(siteMembers)
      .where(and(eq(siteMembers.siteId, siteId), eq(siteMembers.email, email)))
      .limit(1);

    return member ?? null;
  }

  async findById(
    siteId: number,
    memberId: number,
  ): Promise<PublicSiteMember | null> {
    const [member] = await this.db
      .select({
        id: siteMembers.id,
        siteId: siteMembers.siteId,
        email: siteMembers.email,
        name: siteMembers.name,
      })
      .from(siteMembers)
      .where(and(eq(siteMembers.siteId, siteId), eq(siteMembers.id, memberId)))
      .limit(1);

    return member ?? null;
  }

  async create(input: {
    siteId: number;
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<PublicSiteMember> {
    const now = new Date();
    const [result] = await this.db.insert(siteMembers).values({
      siteId: input.siteId,
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id: Number(result.insertId),
      siteId: input.siteId,
      email: input.email,
      name: input.name,
    };
  }
}
