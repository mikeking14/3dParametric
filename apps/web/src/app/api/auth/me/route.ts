import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
      role: session.role,
    },
  });
}
