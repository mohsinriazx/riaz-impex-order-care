import { useLoaderData, useRouteLoaderData, Form } from "react-router";
import { unauthenticated } from "../shopify.server";
import { listComplaints } from "../lib/order-care.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  const status = url.searchParams.get("status") || "";
  const q = url.searchParams.get("q") || "";
  let complaints = [];

  if (shop) {
    try {
      await unauthenticated.admin(shop);
      complaints = await listComplaints({ shopDomain: shop, status: status || undefined, query: q || undefined });
    } catch (_) {}
  }

  return {
    complaints,
    filters: { status, q },
    stats: {
      total: complaints.length,
      new: complaints.filter((c) => c.status === "New").length,
      underReview: complaints.filter((c) => c.status === "Under Review").length,
      resolved: complaints.filter((c) => c.status === "Resolved").length,
    },
  };
}

const STATUS_COLOR = {
  New: "#2563eb", "Under Review": "#d97706", "Awaiting Customer Reply": "#d97706",
  Approved: "#16a34a", "In Resolution": "#7c3aed", Resolved: "#16a34a", Closed: "#6b7280",
};
const PRIORITY_COLOR = { Normal: "#6b7280", High: "#d97706", Urgent: "#dc2626" };
const ALL_STATUSES = ["New", "Under Review", "Awaiting Customer Reply", "Approved", "In Resolution", "Resolved", "Closed"];

export default function OrderCareIndex() {
  const { stats, complaints, filters } = useLoaderData();
  const { shop } = useRouteLoaderData("routes/app") || {};
  const qs = shop ? `?shop=${encodeURIComponent(shop)}` : "";

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24, background: "#f9fafb", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" }}>Order Care</h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>Post-order complaint & resolution management</p>
        </div>
        <a href={`/app/order-care/new${qs}`} style={{
          background: "#2563eb", color: "#fff", padding: "8px 18px",
          borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: 14,
        }}>+ New Case</a>
      </div>

      {/* Customer portal banner */}
      {shop && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, color: "#1e40af", fontWeight: 500 }}>🔗 Customer Portal:</span>
          <input
            readOnly
            value={`${typeof window !== "undefined" ? window.location.origin : ""}/public/order-care?shop=${encodeURIComponent(shop)}`}
            style={{ flex: 1, minWidth: 260, padding: "6px 10px", border: "1px solid #bfdbfe", borderRadius: 6, fontSize: 12, color: "#374151", background: "#fff", cursor: "text" }}
            onClick={(e) => e.target.select()}
          />
          <span style={{ fontSize: 12, color: "#6b7280" }}>Share this link with customers to submit issues</span>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Cases", value: stats.total },
          { label: "New", value: stats.new },
          { label: "Under Review", value: stats.underReview },
          { label: "Resolved", value: stats.resolved },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "16px 24px", minWidth: 120 }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <Form method="get" action={`/app/order-care${qs ? qs + "&" : "?"}`} style={{
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
        padding: "14px 16px", marginBottom: 16,
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
      }}>
        {shop && <input type="hidden" name="shop" value={shop} />}
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="Search by case ID, order, customer…"
          style={{
            flex: 1, minWidth: 200, padding: "8px 12px",
            border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, color: "#111827",
          }}
        />
        <select
          name="status"
          defaultValue={filters.status}
          style={{
            padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6,
            fontSize: 14, color: "#111827", background: "#fff", minWidth: 160,
          }}
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" style={{
          padding: "8px 18px", background: "#2563eb", color: "#fff",
          border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>Filter</button>
        {(filters.q || filters.status) && (
          <a href={`/app/order-care${qs}`} style={{ fontSize: 14, color: "#6b7280", textDecoration: "none" }}>Clear</a>
        )}
      </Form>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        {complaints.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "#6b7280" }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              {filters.q || filters.status ? "No cases match your filters" : "No cases yet"}
            </div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>
              {filters.q || filters.status
                ? "Try adjusting your search or filter."
                : "When customers raise issues, cases will appear here."}
            </div>
            {!filters.q && !filters.status && (
              <a href={`/app/order-care/new${qs}`} style={{
                background: "#2563eb", color: "#fff", padding: "8px 18px",
                borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: 14,
              }}>Create first case</a>
            )}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {["Case ID", "Order", "Customer", "Issue", "Status", "Priority", "Source", "Created"].map((h) => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left", fontWeight: 600,
                    color: "#374151", borderBottom: "1px solid #e5e7eb",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <a href={`/app/order-care/${c.caseId}${qs}`} style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                      {c.caseId}
                    </a>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#374151" }}>{c.shopifyOrderName || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 500, color: "#111827" }}>{c.customerName || "—"}</div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>{c.customerEmail}</div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#374151" }}>{c.issueType}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      background: STATUS_COLOR[c.status] || "#6b7280", color: "#fff",
                      padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    }}>{c.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ color: PRIORITY_COLOR[c.priority] || "#6b7280", fontWeight: 600, fontSize: 12 }}>
                      {c.priority}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                      background: c.source === "customer" ? "#fef3c7" : "#f3f4f6",
                      color: c.source === "customer" ? "#92400e" : "#6b7280" }}>
                      {c.source === "customer" ? "customer" : "admin"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#9ca3af", fontSize: 12 }}>
                    {new Date(c.createdAt).toLocaleDateString("en-GB")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
