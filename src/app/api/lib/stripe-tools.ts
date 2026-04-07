/**
 * Stripe tool operations for agents.
 */

import { stripeFetch } from "./stripe"
import { getStripeAccountId } from "./stripe-store"
import type { StripeToolName, StripeToolResult, StripeToolDefinition } from "./types"

export const STRIPE_TOOLS: StripeToolDefinition[] = [
  {
    name: "stripe.customers.list",
    description: "List customers with optional email filter and pagination",
    params: {
      email: { type: "string", required: false, description: "Filter by email" },
      limit: { type: "number", required: false, description: "Max results (default 10, max 100)" },
      starting_after: { type: "string", required: false, description: "Cursor for pagination (customer ID)" },
    },
  },
  {
    name: "stripe.customers.get",
    description: "Get a specific customer with payment methods and subscriptions",
    params: {
      id: { type: "string", required: true, description: "Customer ID (cus_...)" },
    },
  },
  {
    name: "stripe.customers.create",
    description: "Create a new customer",
    params: {
      name: { type: "string", required: true, description: "Customer name" },
      email: { type: "string", required: true, description: "Customer email" },
      description: { type: "string", required: false, description: "Description" },
    },
  },
  {
    name: "stripe.charges.list",
    description: "List recent charges with optional filters",
    params: {
      customer: { type: "string", required: false, description: "Filter by customer ID" },
      limit: { type: "number", required: false, description: "Max results (default 10)" },
      starting_after: { type: "string", required: false, description: "Cursor for pagination" },
    },
  },
  {
    name: "stripe.balance.get",
    description: "Get the connected account's current balance across all currencies",
    params: {},
  },
  {
    name: "stripe.balance.transactions",
    description: "List recent balance transactions with amounts, fees, and net",
    params: {
      limit: { type: "number", required: false, description: "Max results (default 10)" },
      starting_after: { type: "string", required: false, description: "Cursor for pagination" },
    },
  },
  {
    name: "stripe.invoices.list",
    description: "List invoices with optional filters",
    params: {
      customer: { type: "string", required: false, description: "Filter by customer ID" },
      status: { type: "string", required: false, description: "Filter: draft, open, paid, void, uncollectible" },
      limit: { type: "number", required: false, description: "Max results (default 10)" },
    },
  },
  {
    name: "stripe.subscriptions.list",
    description: "List subscriptions with plan details and status",
    params: {
      customer: { type: "string", required: false, description: "Filter by customer ID" },
      status: { type: "string", required: false, description: "Filter: active, past_due, canceled, etc." },
      limit: { type: "number", required: false, description: "Max results (default 10)" },
    },
  },
  {
    name: "stripe.products.list",
    description: "List all products",
    params: {
      active: { type: "string", required: false, description: "Filter: true or false" },
      limit: { type: "number", required: false, description: "Max results (default 10)" },
    },
  },
  {
    name: "stripe.prices.list",
    description: "List all prices, optionally filtered by product",
    params: {
      product: { type: "string", required: false, description: "Filter by product ID" },
      active: { type: "string", required: false, description: "Filter: true or false" },
      limit: { type: "number", required: false, description: "Max results (default 10)" },
    },
  },
  {
    name: "stripe.payment_links.create",
    description: "Create a shareable payment link",
    params: {
      price: { type: "string", required: true, description: "Price ID (price_...)" },
      quantity: { type: "number", required: false, description: "Quantity (default 1)" },
    },
  },
  {
    name: "stripe.refunds.create",
    description: "Create a refund for a charge or payment intent",
    params: {
      charge: { type: "string", required: false, description: "Charge ID (ch_...) — provide this or payment_intent" },
      payment_intent: { type: "string", required: false, description: "Payment Intent ID (pi_...)" },
      amount: { type: "number", required: false, description: "Amount in cents for partial refund (omit for full)" },
      reason: { type: "string", required: false, description: "Reason: duplicate, fraudulent, requested_by_customer" },
    },
  },
  {
    name: "stripe.payouts.list",
    description: "List recent payouts to the connected account's bank",
    params: {
      limit: { type: "number", required: false, description: "Max results (default 10)" },
      status: { type: "string", required: false, description: "Filter: paid, pending, in_transit, canceled, failed" },
    },
  },
]

// ─── Tool Executor ───────────────────────────────────────────

export async function executeStripeTool(
  tool: StripeToolName,
  params: Record<string, unknown>
): Promise<StripeToolResult> {
  const accountId = getStripeAccountId()
  if (!accountId) {
    return { tool, ok: false, error: "No active Stripe connection" }
  }

  try {
    switch (tool) {
      case "stripe.customers.list": return await execCustomersList(accountId, params)
      case "stripe.customers.get": return await execCustomersGet(accountId, params)
      case "stripe.customers.create": return await execCustomersCreate(accountId, params)
      case "stripe.charges.list": return await execChargesList(accountId, params)
      case "stripe.balance.get": return await execBalanceGet(accountId)
      case "stripe.balance.transactions": return await execBalanceTx(accountId, params)
      case "stripe.invoices.list": return await execInvoicesList(accountId, params)
      case "stripe.subscriptions.list": return await execSubscriptionsList(accountId, params)
      case "stripe.products.list": return await execProductsList(accountId, params)
      case "stripe.prices.list": return await execPricesList(accountId, params)
      case "stripe.payment_links.create": return await execPaymentLinksCreate(accountId, params)
      case "stripe.refunds.create": return await execRefundsCreate(accountId, params)
      case "stripe.payouts.list": return await execPayoutsList(accountId, params)
      default: return { tool, ok: false, error: `Unknown tool: ${tool}` }
    }
  } catch (err) {
    return { tool, ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function ok(tool: StripeToolName, data: unknown): StripeToolResult {
  return { tool, ok: true, data }
}

function buildParams(p: Record<string, unknown>, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of keys) {
    if (p[k] !== undefined && p[k] !== null) out[k] = String(p[k])
  }
  return out
}

// ─── Customers ───────────────────────────────────────────────

async function execCustomersList(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, "/customers", { params: buildParams(p, ["email", "limit", "starting_after"]) })
  return ok("stripe.customers.list", {
    customers: ((data.data as Array<Record<string, unknown>>) ?? []).map((c) => ({
      id: c.id, name: c.name, email: c.email, created: c.created,
      currency: c.currency, balance: c.balance, delinquent: c.delinquent,
    })),
    has_more: data.has_more,
  })
}

async function execCustomersGet(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, `/customers/${p.id}`)
  return ok("stripe.customers.get", {
    id: data.id, name: data.name, email: data.email, phone: data.phone,
    created: data.created, currency: data.currency, balance: data.balance,
    delinquent: data.delinquent, description: data.description,
    subscriptions: (data.subscriptions as Record<string, unknown>)?.data,
  })
}

async function execCustomersCreate(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const body = buildParams(p, ["name", "email", "description"])
  const data = await stripeFetch(acct, "/customers", { method: "POST", body })
  return ok("stripe.customers.create", { id: data.id, name: data.name, email: data.email })
}

// ─── Charges ─────────────────────────────────────────────────

async function execChargesList(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, "/charges", { params: buildParams(p, ["customer", "limit", "starting_after"]) })
  return ok("stripe.charges.list", {
    charges: ((data.data as Array<Record<string, unknown>>) ?? []).map((c) => ({
      id: c.id, amount: c.amount, currency: c.currency, status: c.status,
      paid: c.paid, refunded: c.refunded, customer: c.customer,
      description: c.description, created: c.created,
      receipt_url: c.receipt_url,
    })),
    has_more: data.has_more,
  })
}

// ─── Balance ─────────────────────────────────────────────────

async function execBalanceGet(acct: string): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, "/balance")
  return ok("stripe.balance.get", {
    available: data.available, pending: data.pending, livemode: data.livemode,
  })
}

async function execBalanceTx(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, "/balance_transactions", { params: buildParams(p, ["limit", "starting_after"]) })
  return ok("stripe.balance.transactions", {
    transactions: ((data.data as Array<Record<string, unknown>>) ?? []).map((t) => ({
      id: t.id, amount: t.amount, fee: t.fee, net: t.net,
      currency: t.currency, type: t.type, description: t.description,
      created: t.created, status: t.status,
    })),
    has_more: data.has_more,
  })
}

// ─── Invoices ────────────────────────────────────────────────

async function execInvoicesList(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, "/invoices", { params: buildParams(p, ["customer", "status", "limit"]) })
  return ok("stripe.invoices.list", {
    invoices: ((data.data as Array<Record<string, unknown>>) ?? []).map((i) => ({
      id: i.id, customer: i.customer, status: i.status,
      amount_due: i.amount_due, amount_paid: i.amount_paid,
      currency: i.currency, created: i.created,
      hosted_invoice_url: i.hosted_invoice_url,
    })),
    has_more: data.has_more,
  })
}

// ─── Subscriptions ───────────────────────────────────────────

async function execSubscriptionsList(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, "/subscriptions", { params: buildParams(p, ["customer", "status", "limit"]) })
  return ok("stripe.subscriptions.list", {
    subscriptions: ((data.data as Array<Record<string, unknown>>) ?? []).map((s) => ({
      id: s.id, customer: s.customer, status: s.status,
      current_period_start: s.current_period_start,
      current_period_end: s.current_period_end,
      cancel_at_period_end: s.cancel_at_period_end,
      created: s.created, currency: s.currency,
    })),
    has_more: data.has_more,
  })
}

// ─── Products & Prices ───────────────────────────────────────

async function execProductsList(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, "/products", { params: buildParams(p, ["active", "limit"]) })
  return ok("stripe.products.list", {
    products: ((data.data as Array<Record<string, unknown>>) ?? []).map((pr) => ({
      id: pr.id, name: pr.name, description: pr.description,
      active: pr.active, created: pr.created,
      default_price: pr.default_price,
    })),
    has_more: data.has_more,
  })
}

async function execPricesList(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, "/prices", { params: buildParams(p, ["product", "active", "limit"]) })
  return ok("stripe.prices.list", {
    prices: ((data.data as Array<Record<string, unknown>>) ?? []).map((pr) => ({
      id: pr.id, product: pr.product, unit_amount: pr.unit_amount,
      currency: pr.currency, type: pr.type, active: pr.active,
      recurring: pr.recurring,
    })),
    has_more: data.has_more,
  })
}

// ─── Payment Links ───────────────────────────────────────────

async function execPaymentLinksCreate(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const body: Record<string, string> = {
    "line_items[0][price]": p.price as string,
    "line_items[0][quantity]": String(p.quantity ?? 1),
  }
  const data = await stripeFetch(acct, "/payment_links", { method: "POST", body })
  return ok("stripe.payment_links.create", { id: data.id, url: data.url, active: data.active })
}

// ─── Refunds ─────────────────────────────────────────────────

async function execRefundsCreate(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const body = buildParams(p, ["charge", "payment_intent", "amount", "reason"])
  const data = await stripeFetch(acct, "/refunds", { method: "POST", body })
  return ok("stripe.refunds.create", {
    id: data.id, amount: data.amount, currency: data.currency,
    status: data.status, charge: data.charge, reason: data.reason,
  })
}

// ─── Payouts ─────────────────────────────────────────────────

async function execPayoutsList(acct: string, p: Record<string, unknown>): Promise<StripeToolResult> {
  const data = await stripeFetch(acct, "/payouts", { params: buildParams(p, ["limit", "status"]) })
  return ok("stripe.payouts.list", {
    payouts: ((data.data as Array<Record<string, unknown>>) ?? []).map((po) => ({
      id: po.id, amount: po.amount, currency: po.currency,
      status: po.status, arrival_date: po.arrival_date,
      created: po.created, type: po.type,
    })),
    has_more: data.has_more,
  })
}
