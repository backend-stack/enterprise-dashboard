"use client";

import { useState } from "react";
import { BadgeCheck, Check, CreditCard, Download } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, Td, Tr } from "@/components/dashboard/DataTable";
import { INVOICES, PLANS } from "@/lib/mock-data";
import { formatMoney } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";

/* Billing - one enterprise plan: $2,000 one-time initiation + $499/month.
   The featured card starts Stripe Checkout (initiation fee rides the first
   invoice); the breakdown card spells out exactly what gets charged when.
   Stripe buttons 503 with a friendly notice until keys are in .env. */
export default function BillingPage() {
  const { business } = useAuth();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const plan = PLANS[0];
  // planChosen on the business profile marks an already-subscribed account.
  const isCurrent = Boolean(business?.plan);

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

  const firstInvoice = (plan.price ?? 0) + (plan.setupFee ?? 0);

  return (
    <>
      <PageHeader
        title="Billing"
        subtitle="Your plan, invoices and payment method - powered by Stripe."
      />

      {notice ? (
        <div className="mb-6 rounded-[var(--ad-radius-sm)] border border-[var(--ad-line)] bg-[var(--ad-slate-bg)] px-4 py-3 text-sm text-[var(--ad-ink-soft)]">
          {notice}
        </div>
      ) : null}

      {/* Plan + payment breakdown */}
      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr] sm:gap-6">
        {/* Featured plan */}
        <div
          className="relative overflow-hidden rounded-[var(--ad-radius-card)] p-8 text-white shadow-[var(--ad-shadow-card)]"
          style={{ background: "linear-gradient(130deg, #081b35 0%, #0b2447 55%, #1b3c6a 100%)" }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full"
            style={{ background: "rgba(255,255,255,0.10)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full"
            style={{ background: "rgba(255,255,255,0.07)" }}
          />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]">
                  Enterprise
                </span>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/80">{plan.blurb}</p>
              </div>
              {isCurrent ? (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">
                  <BadgeCheck size={14} /> Current plan
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="ad-display text-5xl font-semibold leading-none tracking-tight">
                {formatMoney(plan.price ?? 0)}
              </span>
              <span className="text-sm text-white/75">/ month</span>
            </div>
            <p className="mt-2 text-[13px] text-white/75">
              + {formatMoney(plan.setupFee ?? 0)} one-time initiation fee on your first invoice
            </p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-white/90">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <Check size={12} strokeWidth={2.5} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={isCurrent || busy !== null}
              onClick={() => callStripe("/api/stripe/checkout", { plan: plan.id })}
              className={`mt-8 h-12 w-full rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed sm:w-auto sm:px-10 ${
                isCurrent ? "bg-white/15 text-white/70" : "bg-white text-[var(--ad-navy)]"
              }`}
            >
              {isCurrent ? "You're on Enterprise" : "Get Enterprise"}
            </button>
          </div>
        </div>

        {/* What you'll pay */}
        <Card>
          <CardHeader title="What you'll pay" />
          <div className="flex flex-col px-6 pb-6">
            <div className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-semibold text-[var(--ad-ink)]">Initiation fee</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ad-muted)]">
                  One-time onboarding - venue setup, assistant training and go-live.
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[var(--ad-ink)]">
                {formatMoney(plan.setupFee ?? 0)}
              </span>
            </div>
            <div className="h-px bg-[var(--ad-line)]" />
            <div className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="text-sm font-semibold text-[var(--ad-ink)]">Enterprise plan</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ad-muted)]">
                  Billed monthly. Cancel any time from the Stripe portal.
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-[var(--ad-ink)]">
                {formatMoney(plan.price ?? 0)} / mo
              </span>
            </div>

            <div className="mt-2 rounded-[var(--ad-radius-sm)] bg-[var(--ad-navy-bg)] p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-[var(--ad-ink-soft)]">Due today</span>
                <span className="ad-display text-2xl font-semibold tracking-tight text-[var(--ad-ink)]">
                  {formatMoney(firstInvoice)}
                </span>
              </div>
              <p className="mt-1 text-right text-[11.5px] text-[var(--ad-muted)]">
                then {formatMoney(plan.price ?? 0)}/month
              </p>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-[var(--ad-muted)]">
              Checkout and receipts are handled by Stripe. Need something
              different?{" "}
              <a
                href="mailto:clo@contextualintelligence.co?subject=Enterprise%20pricing"
                className="font-semibold text-[var(--ad-navy)] hover:underline"
              >
                Talk to us
              </a>
              .
            </p>
          </div>
        </Card>
      </div>

      {/* Payment method + invoices */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.6fr] sm:mt-6 sm:gap-6">
        <Card>
          <CardHeader title="Payment method" />
          <div className="px-6 pb-6">
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
              className="mt-4 w-full rounded-full border border-[var(--ad-line)] px-6 py-3 text-sm font-semibold text-[var(--ad-ink-soft)] transition-colors hover:bg-[var(--ad-panel)] disabled:opacity-50"
            >
              Update payment method
            </button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Invoices" />
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
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--ad-muted)] hover:bg-[var(--ad-panel)] hover:text-[var(--ad-ink)]"
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
