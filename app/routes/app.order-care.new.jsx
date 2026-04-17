import { useState } from "react";
import { Form, useNavigation, useActionData, useRouteLoaderData, redirect } from "react-router";
import { unauthenticated } from "../shopify.server";
import { createComplaint } from "../lib/order-care.server";

const ISSUE_TYPES = [
  "Wrong item received", "Missing item / missing piece", "Damaged on arrival",
  "Wrong size", "Wrong color / style", "Personalization mistake",
  "Delivery issue", "Delivered but not received", "Urgent correction", "Other",
];

export async function action({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";

  if (!shop) return { error: "Shop session lost. Go back and try again." };

  const formData = await request.formData();
  const customerEmail = formData.get("customerEmail")?.trim();
  const issueType = formData.get("issueType")?.trim();
  const message = formData.get("message")?.trim();

  if (!customerEmail || !issueType || !message) {
    return { error: "Customer email, issue type, and complaint message are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { error: "Please enter a valid customer email address." };
  }

  try {
    await unauthenticated.admin(shop);
  } catch (_) {
    return { error: "Could not verify shop session. Please reload and try again." };
  }

  const complaint = await createComplaint({
    shopDomain: shop,
    shopifyOrderId: formData.get("shopifyOrderId") || undefined,
    shopifyOrderName: formData.get("shopifyOrderName") || undefined,
    customerEmail,
    customerName: formData.get("customerName") || undefined,
    issueType,
    productSummary: formData.get("productSummary") || undefined,
    trackingNumber: formData.get("trackingNumber") || undefined,
    carrier: formData.get("carrier") || undefined,
    message,
    priority: formData.get("priority") || "Normal",
    source: "admin",
  });

  return redirect(`/app/order-care/${complaint.caseId}?shop=${encodeURIComponent(shop)}`);
}

const S = {
  page: { fontFamily: "sans-serif", padding: 24, background: "#f9fafb", minHeight: "100vh" },
  header: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 },
  back: { color: "#6b7280", textDecoration: "none", fontSize: 14, marginTop: 4 },
  h1: { margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" },
  sub: { margin: "2px 0 0", fontSize: 13, color: "#6b7280" },
  layout: { display: "flex", gap: 24, alignItems: "flex-start" },
  main: { flex: 1, display: "flex", flexDirection: "column", gap: 16 },
  sidebar: { width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 },
  cardTitle: { margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#111827" },
  row: { display: "flex", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: 500, color: "#374151" },
  req: { color: "#dc2626", marginLeft: 2 },
  input: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, color: "#111827", background: "#fff", width: "100%", boxSizing: "border-box" },
  inputHighlight: { padding: "8px 12px", border: "2px solid #2563eb", borderRadius: 6, fontSize: 14, color: "#111827", background: "#eff6ff", width: "100%", boxSizing: "border-box" },
  textarea: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, color: "#111827", background: "#fff", width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 120 },
  select: { padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, color: "#111827", background: "#fff", width: "100%", boxSizing: "border-box" },
  hint: { fontSize: 12, color: "#9ca3af" },
  btn: { width: "100%", padding: "10px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "10px 0", background: "#93c5fd", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600 },
  lookupBtn: { padding: "8px 14px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", whiteSpace: "nowrap" },
  cancel: { display: "block", textAlign: "center", marginTop: 8, color: "#6b7280", textDecoration: "none", fontSize: 14 },
  error: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "12px 16px", color: "#991b1b", fontSize: 14 },
  lookupError: { color: "#dc2626", fontSize: 12, marginTop: 4 },
  lookupSuccess: { color: "#16a34a", fontSize: 12, marginTop: 4 },
};

export default function NewComplaint() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { shop } = useRouteLoaderData("routes/app") || {};
  const qs = shop ? `?shop=${encodeURIComponent(shop)}` : "";

  const [lookupState, setLookupState] = useState({ loading: false, error: "", found: false });
  const [orderFields, setOrderFields] = useState({ shopifyOrderId: "", shopifyOrderName: "", customerEmail: "", customerName: "" });

  async function handleOrderLookup(e) {
    const val = e.target.closest(".order-row").querySelector("[name=shopifyOrderName]").value.trim();
    if (!val || !shop) return;
    setLookupState({ loading: true, error: "", found: false });
    try {
      const res = await fetch(`/api/order-lookup?shop=${encodeURIComponent(shop)}&orderName=${encodeURIComponent(val)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order not found");
      setOrderFields({ shopifyOrderId: data.orderId, shopifyOrderName: data.orderName, customerEmail: data.customerEmail, customerName: data.customerName });
      setLookupState({ loading: false, error: "", found: true });
    } catch (err) {
      setLookupState({ loading: false, error: err.message, found: false });
    }
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <a href={`/app/order-care${qs}`} style={S.back}>← Back</a>
        <div>
          <h1 style={S.h1}>New Case</h1>
          <p style={S.sub}>Log a new customer complaint or post-order issue</p>
        </div>
      </div>

      <Form method="post" action={`/app/order-care/new${qs}`}>
        <div style={S.layout}>
          <div style={S.main}>
            {actionData?.error && <div style={S.error}>{actionData.error}</div>}

            <div style={S.card}>
              <h2 style={S.cardTitle}>Order Lookup</h2>
              <div className="order-row" style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Order Number</label>
                  <input
                    name="shopifyOrderName"
                    placeholder="#1001"
                    value={orderFields.shopifyOrderName}
                    onChange={(e) => setOrderFields((p) => ({ ...p, shopifyOrderName: e.target.value }))}
                    style={lookupState.found ? S.inputHighlight : S.input}
                  />
                </div>
                <button type="button" onClick={handleOrderLookup} style={S.lookupBtn} disabled={lookupState.loading}>
                  {lookupState.loading ? "Looking up…" : "Look Up"}
                </button>
              </div>
              {lookupState.error && <div style={S.lookupError}>⚠ {lookupState.error}</div>}
              {lookupState.found && <div style={S.lookupSuccess}>✓ Order found — customer details pre-filled</div>}
              <input type="hidden" name="shopifyOrderId" value={orderFields.shopifyOrderId} />
            </div>

            <div style={S.card}>
              <h2 style={S.cardTitle}>Customer</h2>
              <div style={S.row}>
                <div style={S.field}>
                  <label style={S.label}>Email<span style={S.req}>*</span></label>
                  <input
                    name="customerEmail"
                    type="email"
                    placeholder="customer@example.com"
                    value={orderFields.customerEmail}
                    onChange={(e) => setOrderFields((p) => ({ ...p, customerEmail: e.target.value }))}
                    style={S.input}
                    required
                  />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Name</label>
                  <input
                    name="customerName"
                    placeholder="Full name"
                    value={orderFields.customerName}
                    onChange={(e) => setOrderFields((p) => ({ ...p, customerName: e.target.value }))}
                    style={S.input}
                  />
                </div>
              </div>
            </div>

            <div style={S.card}>
              <h2 style={S.cardTitle}>Complaint</h2>
              <div style={S.field}>
                <label style={S.label}>Issue Type<span style={S.req}>*</span></label>
                <select name="issueType" style={S.select} required defaultValue="">
                  <option value="">Select issue type…</option>
                  {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Product(s) Affected</label>
                <input name="productSummary" placeholder="e.g. Master Mason Apron — Personalised, Size L" style={S.input} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Complaint Message<span style={S.req}>*</span></label>
                <textarea name="message" placeholder="Describe the issue in detail. Include what was expected vs what was received." style={S.textarea} required />
              </div>
              <div style={S.field}>
                <label style={S.label}>Priority</label>
                <select name="priority" style={S.select} defaultValue="Normal">
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={S.card}>
              <h2 style={S.cardTitle}>Shipment (Optional)</h2>
              <div style={S.row}>
                <div style={S.field}>
                  <label style={S.label}>Tracking Number</label>
                  <input name="trackingNumber" placeholder="JD123456789GB" style={S.input} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Carrier</label>
                  <input name="carrier" placeholder="Royal Mail, DHL, FedEx…" style={S.input} />
                </div>
              </div>
            </div>
          </div>

          <div style={S.sidebar}>
            <div style={S.card}>
              <h2 style={S.cardTitle}>Create Case</h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>A unique Case ID is generated automatically.</p>
              <button type="submit" style={isSubmitting ? S.btnDisabled : S.btn} disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create Case"}
              </button>
              <a href={`/app/order-care${qs}`} style={S.cancel}>Cancel</a>
            </div>
            <div style={S.card}>
              <h2 style={S.cardTitle}>Issue Types</h2>
              {ISSUE_TYPES.map((t) => <div key={t} style={{ fontSize: 12, color: "#6b7280", padding: "2px 0" }}>· {t}</div>)}
            </div>
            <div style={S.card}>
              <h2 style={S.cardTitle}>Customer Portal</h2>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px" }}>Share this link with customers to let them submit issues directly.</p>
              {shop && (
                <input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/public/order-care?shop=${encodeURIComponent(shop)}`}
                  style={{ ...S.input, fontSize: 11, color: "#6b7280", cursor: "text" }}
                  onClick={(e) => e.target.select()}
                />
              )}
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}
