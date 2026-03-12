import bcrypt from "bcryptjs";
import { getSession, type SessionData } from "./session";
import { redirect } from "next/navigation";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) {
    redirect("/login");
  }
  return session as SessionData;
}
