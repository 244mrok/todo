import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { getDb, initSchema, BOARDS_DIR } from "./db";
import type { AuthUser, JwtPayload } from "@/types/auth";
import fs from "fs";

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

export async function createUser(
  email: string,
  passwordHash: string,
  name: string,
): Promise<AuthUser> {
  await initSchema();
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.execute({
    sql: `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, email.toLowerCase(), passwordHash, name, now, now],
  });

  // If this is the first user, inherit all existing boards
  const countResult = await db.execute("SELECT COUNT(*) as count FROM users");
  const userCount = Number(countResult.rows[0].count);
  if (userCount === 1) {
    await inheritExistingBoards(id);
  }

  return {
    id,
    email: email.toLowerCase(),
    name,
    createdAt: now,
  };
}

export async function getUserByEmail(email: string) {
  await initSchema();
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email.toLowerCase()],
  });

  if (result.rows.length === 0) return undefined;
  const row = result.rows[0];
  return {
    id: row.id as string,
    email: row.email as string,
    password_hash: row.password_hash as string,
    name: row.name as string,
    email_verified: row.email_verified as number,
    created_at: row.created_at as string,
  };
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  await initSchema();
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE id = ?",
    args: [id],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    createdAt: row.created_at as string,
  };
}

export async function updatePassword(userId: string, passwordHash: string) {
  await initSchema();
  const db = getDb();
  await db.execute({
    sql: "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
    args: [passwordHash, userId],
  });
}

// ─── Email Tokens ───

export async function createEmailToken(
  userId: string,
  type: "reset",
): Promise<string> {
  await initSchema();
  const db = getDb();
  const id = uuidv4();
  const token = uuidv4();
  const hours = 1;
  const expiresAt = new Date(
    Date.now() + hours * 60 * 60 * 1000,
  ).toISOString();

  // Invalidate previous tokens of the same type for this user
  await db.execute({
    sql: "UPDATE email_tokens SET used = 1 WHERE user_id = ? AND type = ? AND used = 0",
    args: [userId, type],
  });

  await db.execute({
    sql: `INSERT INTO email_tokens (id, user_id, type, token, expires_at, used)
          VALUES (?, ?, ?, ?, ?, 0)`,
    args: [id, userId, type, token, expiresAt],
  });

  return token;
}

export async function consumeEmailToken(
  token: string,
  type: "reset",
): Promise<string | null> {
  await initSchema();
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM email_tokens WHERE token = ? AND type = ? AND used = 0",
    args: [token, type],
  });

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (new Date(row.expires_at as string) < new Date()) return null;

  await db.execute({
    sql: "UPDATE email_tokens SET used = 1 WHERE id = ?",
    args: [row.id as string],
  });

  return row.user_id as string;
}

// ─── Board Ownership ───

export async function addBoardOwnership(boardId: string, userId: string) {
  await initSchema();
  const db = getDb();
  await db.execute({
    sql: "INSERT OR IGNORE INTO board_ownership (board_id, user_id, role) VALUES (?, ?, 'owner')",
    args: [boardId, userId],
  });
}

export async function getUserBoards(userId: string): Promise<string[]> {
  await initSchema();
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT board_id FROM board_ownership WHERE user_id = ?",
    args: [userId],
  });
  return result.rows.map((r) => r.board_id as string);
}

export async function isBoardOwner(
  boardId: string,
  userId: string,
): Promise<boolean> {
  await initSchema();
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT 1 FROM board_ownership WHERE board_id = ? AND user_id = ?",
    args: [boardId, userId],
  });
  return result.rows.length > 0;
}

async function inheritExistingBoards(userId: string) {
  if (!fs.existsSync(BOARDS_DIR)) return;

  const files = fs.readdirSync(BOARDS_DIR).filter((f) => f.endsWith(".json"));
  const db = getDb();

  for (const file of files) {
    const boardId = file.replace(".json", "");
    await db.execute({
      sql: "INSERT OR IGNORE INTO board_ownership (board_id, user_id, role) VALUES (?, ?, 'owner')",
      args: [boardId, userId],
    });
  }
}
