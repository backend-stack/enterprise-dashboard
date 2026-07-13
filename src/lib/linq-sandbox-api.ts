import "server-only";
import { NextResponse } from "next/server";
import { SandboxError, resolveTenant, type SandboxTenant } from "@/lib/linq-sandbox";

/* Shared plumbing for the /api/v3 sandbox routes: tenant resolution from the
   ?tenant= query param (or x-tenant-id header) and uniform error envelopes.
   These routes serve DUMMY data only, so they sit behind the dashboard's
   page-level auth rather than Firebase bearer checks - they must keep
   working in local demos with no Firebase configured. */

export function tenantFrom(req: Request): SandboxTenant {
  const url = new URL(req.url);
  const id = url.searchParams.get("tenant") ?? req.headers.get("x-tenant-id");
  return resolveTenant(id);
}

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
