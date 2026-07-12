"use client";

import { useState } from "react";
import { Check, CreditCard, Download, ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { INVOICES, PLANS } from "@/lib/mock-data";
import { formatMoney } from "@/lib/format";

/* Billing — Stripe-backed. The buttons call /api/stripe/* routes which
   return 503 with a friendly message until STRIPE_SECRET_KEY is in .env;
   the UI surfaces that as a banner instead of failing silently. */
export default function BillingPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const callStripe = async (path: string, body?: object) => {
    setBusy(path + JSON.stringify(body ?? {}));
    setNotice(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setNotice(data.error ?? "Something went wrong talking to Stripe.");
      }
    } catch {
      setNotice("Could not reach the billing API.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Plans, invoices and payment method — powered by Stripe."
        action={
          <button
            type="button"
            onClick={() => callStripe("/api/stripe/portal")}
            className="flex items-center gap-2 rounded-full bg-[var(--ad-ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--ad-shadow-card)] transition-opacity hover:opacity-90 disabled:opacity-50"
            disabled={busy !== null}
          >
            <ExternalLink size={15} />
            Manage in Stripe
          </button>
        }
      />

      {notice ? (
        <div className="mb-5 rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-orange-bg)] px-4 py-3 text-sm text-[var(--ad-ink-soft)]">
          {notice}
        </div>
      ) : null}

      {/* Plans */}
      <Card className="p-1.5">
        <CardHeader title="Plans" accent="var(--ad-orange)" />
        <div className="grid gap-4 p-4 pt-1 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-[var(--ad-radius-sm)] border p-6"
              style={{
                backgroundColor: plan.current ? "var(--ad-navy)" : "var(--ad-panel)",
                color: plan.current ? "#fff" : "var(--ad-ink)",
                borderColor: plan.current ? "var(--ad-navy)" : "var(--ad-line)",
                boxShadow: "var(--ad-shadow-card)",
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[15px] font-semibold">{plan.name}</span>
                {plan.current ? (
                  <span className="rounded-full bg-white/16 px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: "rgba(255,255,255,0.16)" }}>
                    Current plan
                  </span>
                ) : null}
              </div>
              <p
                className="mb-5 text-xs"
                style={{ opacity: plan.current ? 0.75 : 1, color: plan.current ? "#fff" : "var(--ad-muted)" }}
              >
                {plan.blurb}
              </p>
              <div className="mb-5 flex items-baseline gap-1">
                <span className="ad-display text-[2.25rem] font-semibold leading-none tracking-tight">
                  {formatMoney(plan.price)}
                </span>
                <span
                  className="text-xs"
                  style={{ opacity: plan.current ? 0.75 : 1, color: plan.current ? "#fff" : "var(--ad-muted)" }}
                >
                  / month
                </span>
              </div>
              <ul className="mb-6 flex flex-col gap-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-[13px]">
                    <Check
                      size={14}
                      style={{ color: plan.current ? "var(--ad-orange-soft)" : "var(--ad-positive)" }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={plan.current || busy !== null}
                onClick={() => callStripe("/api/stripe/checkout", { plan: plan.id })}
                className={`mt-auto rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed ${
                  plan.current
                    ? "bg-white/10 text-white/60"
                    : "bg-[var(--ad-ink)] text-white shadow-[var(--ad-shadow-card)]"
                }`}
              >
                {plan.current ? "Active" : "Upgrade"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Payment method + invoices */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.6fr] sm:mt-6 sm:gap-6">
        <Card className="p-1.5">
          <CardHeader title="Payment method" accent="var(--ad-navy)" />
          <div className="px-5 pb-6 pt-1">
            <div className="flex items-center gap-4 rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-panel)] p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ad-navy-bg)] text-[var(--ad-navy)]">
                <CreditCard size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ad-ink)]">
                  Visa ending in 4242
                </p>
                <p className="text-xs text-[var(--ad-muted)]">Expires 08 / 2028</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => callStripe("/api/stripe/portal")}
              disabled={busy !== null}
              className="mt-4 w-full rounded-full border border-[var(--ad-line)] px-5 py-2.5 text-sm font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)] disabled:opacity-50"
            >
              Update payment method
            </button>
          </div>
        </Card>

        <Card className="p-1.5">
          <CardHeader title="Invoices" accent="var(--ad-orange)" />
          <DataTable headers={["Invoice", "Period", "Amount", "Status", ""]}>
            {INVOICES.map((inv) => (
              <Tr key={inv.id}>
                <Td className="font-medium text-[var(--ad-ink)]">{inv.id}</Td>
                <Td>{inv.period}</Td>
                <Td className="font-semibold text-[var(--ad-ink)]">
                  {formatMoney(inv.amount)}
                </Td>
                <Td>
                  <StatusBadge tone={inv.status === "paid" ? "positive" : "pending"}>
                    {inv.status}
                  </StatusBadge>
                </Td>
                <Td>
                  <button
                    type="button"
                    aria-label={`Download ${inv.id}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--ad-muted)] hover:bg-[var(--ad-panel)] hover:text-[var(--ad-ink)]"
                  >
                    <Download size={15} />
                  </button>
                </Td>
              </Tr>
            ))}
          </DataTable>
        </Card>
      </div>
    </>
  );
}
