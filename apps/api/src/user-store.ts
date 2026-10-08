import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from "node:crypto";
import type { RestaurantReviewStore } from "./restaurant-review-store.js";

export interface StoredUser {
  id: string;
  email: string;
  username: string; // Normalized handle without '@'
  name: string; // Display name e.g. '@username'
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
  usernameChanges: number[]; // Epoch timestamps (ms) of past updates
  resetTokens: { token: string; expiresAt: number }[];
}

import {
  normalizeUsername,
  validateUsername,
} from "@vegan-tools/domain";

export {
  normalizeUsername,
  validateUsername,
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [salt, key] = hash.split(":");
    if (!salt || !key) return false;
    const derivedKey = scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

export interface CreateUserParams {
  email: string;
  username: string;
  password?: string;
  name?: string;
}

export interface UserStore {
  createUser(params: CreateUserParams): Promise<StoredUser>;
  getUserById(id: string): Promise<StoredUser | undefined>;
  getUserByEmail(email: string): Promise<StoredUser | undefined>;
  getUserByUsername(username: string): Promise<StoredUser | undefined>;
  checkEmailAvailable(email: string): Promise<boolean>;
  checkUsernameAvailable(username: string): Promise<boolean>;
  updateUsername(
    userId: string,
    newUsername: string,
    reviewStore?: RestaurantReviewStore,
  ): Promise<{ user: StoredUser; cascadedReviews: number }>;
  requestPasswordReset(email: string): Promise<{ token: string; expiresAt: number } | null>;
  resetPasswordWithToken(token: string, newPassword: string): Promise<StoredUser>;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export class MemoryUserStore implements UserStore {
  private readonly usersById = new Map<string, StoredUser>();

  async createUser(params: CreateUserParams): Promise<StoredUser> {
    const email = params.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email format.");
    }

    const emailTaken = await this.getUserByEmail(email);
    if (emailTaken) {
      throw new Error("Email is already registered.");
    }

    const validation = validateUsername(params.username, { email });
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid username.");
    }
    const cleanUser = normalizeUsername(params.username);

    const usernameTaken = await this.getUserByUsername(cleanUser);
    if (usernameTaken) {
      throw new Error("Username is already taken.");
    }

    const now = new Date().toISOString();
    const user: StoredUser = {
      id: randomUUID(),
      email,
      username: cleanUser,
      name: cleanUser,
      passwordHash: params.password ? hashPassword(params.password) : undefined,
      createdAt: now,
      updatedAt: now,
      usernameChanges: [],
      resetTokens: [],
    };

    this.usersById.set(user.id, user);
    return user;
  }

  async getUserById(id: string): Promise<StoredUser | undefined> {
    return this.usersById.get(id);
  }

  async getUserByEmail(email: string): Promise<StoredUser | undefined> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.usersById.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return undefined;
  }

  async getUserByUsername(username: string): Promise<StoredUser | undefined> {
    const clean = normalizeUsername(username);
    for (const user of this.usersById.values()) {
      if (user.username.toLowerCase() === clean.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  async checkEmailAvailable(email: string): Promise<boolean> {
    const existing = await this.getUserByEmail(email);
    return !existing;
  }

  async checkUsernameAvailable(username: string, email?: string): Promise<boolean> {
    const validation = validateUsername(username, { email });
    if (!validation.valid) return false;
    const clean = normalizeUsername(username);
    const existing = await this.getUserByUsername(clean);
    return !existing;
  }

  async updateUsername(
    userId: string,
    newUsername: string,
    reviewStore?: RestaurantReviewStore,
  ): Promise<{ user: StoredUser; cascadedReviews: number }> {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error("User not found.");
    }

    const validation = validateUsername(newUsername, { email: user.email });
    if (!validation.valid) {
      throw new Error(validation.error || "Invalid username.");
    }
    const clean = normalizeUsername(newUsername);

    // If identical to current username, return immediately
    if (user.username.toLowerCase() === clean.toLowerCase()) {
      return { user, cascadedReviews: 0 };
    }

    // Check uniqueness among other users
    const existing = await this.getUserByUsername(clean);
    if (existing && existing.id !== userId) {
      throw new Error("Username is already taken.");
    }

    // Rate-limit check: max 2 changes per 30 rolling days
    const now = Date.now();
    const cutoff = now - THIRTY_DAYS_MS;
    const recentChanges = user.usernameChanges.filter((ts) => ts > cutoff);
    if (recentChanges.length >= 2) {
      throw new Error("Rate limit exceeded: maximum 2 username changes per 30 days.");
    }

    // Apply change
    user.username = clean;
    user.name = clean;
    user.updatedAt = new Date().toISOString();
    user.usernameChanges = [...recentChanges, now];

    // Cascade update to reviews if reviewStore provided
    let cascadedReviews = 0;
    if (reviewStore) {
      cascadedReviews = await reviewStore.updateAuthorUsername(userId, clean);
    }

    return { user, cascadedReviews };
  }

  async requestPasswordReset(
    email: string,
  ): Promise<{ token: string; expiresAt: number } | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity

    // Purge expired tokens and store new one
    user.resetTokens = user.resetTokens.filter((t) => t.expiresAt > Date.now());
    user.resetTokens.push({ token, expiresAt });

    return { token, expiresAt };
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<StoredUser> {
    if (!token || !newPassword || newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    const now = Date.now();
    let targetUser: StoredUser | undefined;

    for (const user of this.usersById.values()) {
      const activeToken = user.resetTokens.find(
        (t) => t.token === token && t.expiresAt > now,
      );
      if (activeToken) {
        targetUser = user;
        break;
      }
    }

    if (!targetUser) {
      throw new Error("Invalid or expired password reset token.");
    }

    // Update password and remove token
    targetUser.passwordHash = hashPassword(newPassword);
    targetUser.resetTokens = targetUser.resetTokens.filter((t) => t.token !== token);
    targetUser.updatedAt = new Date().toISOString();

    return targetUser;
  }
}

let sharedUserStore: UserStore | null = null;

export function getUserStore(): UserStore {
  if (!sharedUserStore) {
    sharedUserStore = new MemoryUserStore();
  }
  return sharedUserStore;
}
