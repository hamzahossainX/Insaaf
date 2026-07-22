import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "./config";

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

export interface JwtPayload {
  sub: string; // user id
  role: "ADMIN" | "MEMBER";
  wing_id: string | null;
  name: string;
  ver: number;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}
