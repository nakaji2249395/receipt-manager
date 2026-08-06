import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Repository } from "../repository";
import type { Claim, ClaimItem, ClaimWithItems, DataStore, UserProfile } from "../types";

const directory = path.join(process.cwd(), ".data");
const file = path.join(directory, "store.json");
const emptyStore: DataStore = { users: [], claims: [], items: [] };

let queue = Promise.resolve();

async function readStore(): Promise<DataStore> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as DataStore;
  } catch {
    await mkdir(directory, { recursive: true });
    return structuredClone(emptyStore);
  }
}

async function writeStore(data: DataStore) {
  await mkdir(directory, { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2));
  await rename(temporary, file);
}

function mutate(fn: (data: DataStore) => void) {
  const operation = queue.then(async () => {
    const data = await readStore();
    fn(data);
    await writeStore(data);
  });
  queue = operation.catch(() => undefined);
  return operation;
}

function combine(claim: Claim, items: ClaimItem[]): ClaimWithItems {
  return { ...claim, items: items.filter((item) => item.claimId === claim.id) };
}

export class LocalRepository implements Repository {
  async findUserByEmail(email: string) {
    return (await readStore()).users.find((user) => user.email === email) || null;
  }

  async getUserById(id: string) {
    return (await readStore()).users.find((user) => user.id === id) || null;
  }

  createUser(user: UserProfile) {
    return mutate((data) => data.users.push(user));
  }

  updateUser(user: UserProfile) {
    return mutate((data) => {
      const index = data.users.findIndex((candidate) => candidate.id === user.id);
      if (index < 0) throw new Error("ユーザーが見つかりません");
      data.users[index] = user;
    });
  }

  createClaim(claim: Claim, items: ClaimItem[]) {
    return mutate((data) => {
      data.claims.push(claim);
      data.items.push(...items);
    });
  }

  async getClaim(id: string) {
    const data = await readStore();
    const claim = data.claims.find((candidate) => candidate.id === id);
    return claim ? combine(claim, data.items) : null;
  }

  async listClaimsForUser(userId: string) {
    const data = await readStore();
    return data.claims
      .filter((claim) => claim.userId === userId)
      .map((claim) => combine(claim, data.items))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  async listClaims() {
    const data = await readStore();
    return data.claims
      .map((claim) => combine(claim, data.items))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  updateClaim(claim: Claim) {
    return mutate((data) => {
      const index = data.claims.findIndex((candidate) => candidate.id === claim.id);
      if (index < 0) throw new Error("請求が見つかりません");
      data.claims[index] = claim;
    });
  }
}
