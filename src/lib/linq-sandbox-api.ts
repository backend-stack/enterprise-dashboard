import "server-only";
import { NextResponse } from "next/server";
import { SandboxError } from "@/lib/linq-sandbox";

/* Shared plumbing for the /api/v3 sandbox routes: body parsing and uniform
   error envelopes. These routes serve DUMMY data only, so they sit behind
   the dashboard's page-level auth rather than Firebase bearer checks - they
   must keep working in local demos with no Firebase configured. */

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const json = (await req.json()) as unknown;
    return json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function sandboxHandler(
  fn: (req: Request, chatId: string) => Promise<NextResponse> | NextResponse
) {
  return async (
    req: Request,
    ctx: { params: Promise<{ chatId: string }> }
  ): Promise<NextResponse> => {
    const { chatId } = await ctx.params;
    try {
      return await fn(req, chatId);
    } catch (err) {
      if (err instanceof SandboxError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      throw err;
    }
  };
}
