"use client";

import { CircleCheck, CircleDashed } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth-context";
import { firebaseEnabled } from "@/lib/firebase";

function Field({
  label,
  defaultValue,
  type = "text",
}: {
  label: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ad-muted)]">
        {label}
      </span>
      <input
        type={type}
        defaultValue={defaultValue}
        className="h-11 rounded-xl border border-[var(--ad-line)] bg-[var(--ad-panel)] px-4 text-sm text-[var(--ad-ink)] focus:border-[var(--ad-ink-soft)] focus:outline-none"
      />
    </label>
  );
}

function IntegrationRow({
  name,
  detail,
  connected,
}: {
  name: string;
  detail: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel)] p-4">
      {connected ? (
        <CircleCheck size={20} className="shrink-0 text-[var(--ad-positive)]" />
      ) : (
        <CircleDashed size={20} className="shrink-0 text-[var(--ad-muted)]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ad-ink)]">{name}</p>
        <p className="text-xs text-[var(--ad-muted)]">{detail}</p>
      </div>
      <span
        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={
          connected
            ? { color: "var(--ad-positive)", backgroundColor: "var(--ad-positive-bg)" }
            : { color: "var(--ad-pending)", backgroundColor: "var(--ad-pending-bg)" }
        }
      >
        {connected ? "Connected" : "Awaiting keys"}
      </span>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Workspace profile and integration status."
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr] sm:gap-6">
        <Card className="p-1.5">
          <CardHeader title="Profile" accent="var(--ad-orange)" />
          <form
            className="flex flex-col gap-4 px-5 pb-6 pt-1"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" defaultValue={user?.name} />
              <Field label="Email" defaultValue={user?.email} type="email" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company" defaultValue="Acme Retail Co." />
              <Field label="Role" defaultValue="Operations" />
            </div>
            <button
              type="submit"
              className="mt-2 self-start rounded-full bg-[var(--ad-ink)] px-6 py-2.5 text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90"
            >
              Save changes
            </button>
          </form>
        </Card>

        <Card className="p-1.5">
          <CardHeader title="Integrations" accent="var(--ad-navy)" />
          <div className="flex flex-col gap-3 px-5 pb-6 pt-1">
            <IntegrationRow
              name="Firebase Authentication"
              detail="Sign-in, user accounts and access control."
              connected={firebaseEnabled}
            />
            <IntegrationRow
              name="Stripe Billing"
              detail="Subscriptions, invoices and the customer portal."
              connected={Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)}
            />
            <p className="mt-1 text-xs leading-relaxed text-[var(--ad-muted)]">
              Add your keys to <code className="rounded bg-[var(--ad-panel)] px-1 py-0.5">.env</code>{" "}
              (see <code className="rounded bg-[var(--ad-panel)] px-1 py-0.5">.env.example</code>)
              and restart the dev server — both integrations light up automatically,
              no code changes needed.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
