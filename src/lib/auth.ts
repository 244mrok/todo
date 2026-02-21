import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db";
import type { AuthUser, JwtPayload } from "@/types/auth";
import fs from "fs";
import path from "path";

const SALT_ROUNDS = 12;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required");
  return secret;
}

// ─── Password ───

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT ───

export function signJwt(
  payload: { userId: string; email: string },
  expiresIn: number | string = "7d",
): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload;
  } catch {
    return null;
  }
}

// ─── User CRUD ───

export function createUser(
  email: string,
  passwordHash: string,
  name: string,
): AuthUser {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, email_verified, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`,
  ).run(id, email.toLowerCase(), passwordHash, name, now, now);

  // If this is the first user, inherit all existing boards
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };
  if (userCount.count === 1) {
    inheritExistingBoards(id);
  }

  return { id, email: email.toLowerCase(), name, emailVerified: false, createdAt: now };
}

export function getUserByEmail(email: string) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase()) as
    | {
        id: string;
        email: string;
        password_hash: string;
        name: string;
        email_verified: number;
        created_at: string;
      }
    | undefined;
}

export function getUserById(id: string): AuthUser | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | {
        id: string;
        email: string;
        name: string;
        email_verified: number;
        created_at: string;
      }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: row.email_verified === 1,
    createdAt: row.created_at,
  };
}

export function markEmailVerified(userId: string) {
  const db = getDb();
  db.prepare(
    "UPDATE users SET email_verified = 1, updated_at = datetime('now') WHERE id = ?",
  ).run(userId);
}

export function updatePassword(userId: string, passwordHash: string) {
  const db = getDb();
  db.prepare(
    "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(passwordHash, userId);
}

// ─── Email Tokens ───

export function createEmailToken(
  userId: string,
  type: "verify" | "reset",
): string {
  const db = getDb();
  const id = uuidv4();
  const token = uuidv4();
  const hours = type === "verify" ? 24 : 1;
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

  // Invalidate previous tokens of the same type for this user
  db.prepare(
    "UPDATE email_tokens SET used = 1 WHERE user_id = ? AND type = ? AND used = 0",
  ).run(userId, type);

  db.prepare(
    `INSERT INTO email_tokens (id, user_id, type, token, expires_at, used)
     VALUES (?, ?, ?, ?, ?, 0)`,
  ).run(id, userId, type, token, expiresAt);

  return token;
}

export function consumeEmailToken(
  token: string,
  type: "verify" | "reset",
): string | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT * FROM email_tokens WHERE token = ? AND type = ? AND used = 0",
    )
    .get(token, type) as
    | { id: string; user_id: string; expires_at: string }
    | undefined;

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  db.prepare("UPDATE email_tokens SET used = 1 WHERE id = ?").run(row.id);
  return row.user_id;
}

// ─── Board Ownership ───

export function addBoardOwnership(boardId: string, userId: string) {
  const db = getDb();
  db.prepare(
    "INSERT OR IGNORE INTO board_ownership (board_id, user_id, role) VALUES (?, ?, 'owner')",
  ).run(boardId, userId);
}

export function getUserBoards(userId: string): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT board_id FROM board_ownership WHERE user_id = ?")
    .all(userId) as { board_id: string }[];
  return rows.map((r) => r.board_id);
}

export function isBoardOwner(boardId: string, userId: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT 1 FROM board_ownership WHERE board_id = ? AND user_id = ?",
    )
    .get(boardId, userId);
  return !!row;
}

function inheritExistingBoards(userId: string) {
  const boardsDir = path.join(process.cwd(), "data", "boards");
  if (!fs.existsSync(boardsDir)) return;

  const files = fs.readdirSync(boardsDir).filter((f) => f.endsWith(".json"));
  const db = getDb();
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO board_ownership (board_id, user_id, role) VALUES (?, ?, 'owner')",
  );

  for (const file of files) {
    const boardId = file.replace(".json", "");
    stmt.run(boardId, userId);
  }
}
