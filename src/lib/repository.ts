import type { Claim, ClaimItem, ClaimWithItems, UserProfile } from "./types";
import { LocalRepository } from "./repository/local";
import { SheetsRepository } from "./repository/sheets";

export interface Repository {
  findUserByEmail(email: string): Promise<UserProfile | null>;
  getUserById(id: string): Promise<UserProfile | null>;
  createUser(user: UserProfile): Promise<void>;
  updateUser(user: UserProfile): Promise<void>;
  createClaim(claim: Claim, items: ClaimItem[]): Promise<void>;
  getClaim(id: string): Promise<ClaimWithItems | null>;
  listClaimsForUser(userId: string): Promise<ClaimWithItems[]>;
  listClaims(): Promise<ClaimWithItems[]>;
  updateClaim(claim: Claim): Promise<void>;
}

let instance: Repository | null = null;

export function getRepository(): Repository {
  if (instance) return instance;
  instance = process.env.STORAGE_MODE === "sheets" ? new SheetsRepository() : new LocalRepository();
  return instance;
}
