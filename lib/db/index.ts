import { getSharedMemoryStore } from "@/lib/db/memoryStore";
import { PrismaStore } from "@/lib/db/prismaStore";
import type { AppStore } from "@/lib/db/store";

let prismaStore: PrismaStore | null = null;

export function getStore(): AppStore {
  if (process.env.APP_DATA_MODE === "memory") {
    return getSharedMemoryStore();
  }

  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is required in production unless APP_DATA_MODE=memory is explicitly set.");
    }

    return getSharedMemoryStore();
  }

  prismaStore ??= new PrismaStore();
  return prismaStore;
}
