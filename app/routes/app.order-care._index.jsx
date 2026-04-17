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
  New: "#3b82f6", "Under Review": "#f59e0b", "Awaiting Customer Reply": "#f59e0b",
  Approved: "#10b981", "In Resolution": "#8b5cf6", Resolved: "#10b981", Closed: "#6b7280",
};
const PRIORITY_COLOR = { Normal: "#6b7280", High: "#d97706", Urgent: "#ef4444" };
const ALL_STATUSES = ["New", "Under Review", "Awaiting Customer Reply", "Approved", "In Resolution", "Resolved", "Closed"];

const STAT_CONFIG = [
  { label: "Total Cases", key: "total", icon: "📋", bg: "linear-gradient(135deg,#1e3a5f,#2563eb)", shadow: "rgba(37,99,235,0.3)" },
  { label: "New Cases",   key: "new",   icon: "🔵", bg: "linear-gradient(135deg,#1d4ed8,#60a5fa)", shadow: "rgba(96,165,250,0.3)" },
  { label: "Under Review",key: "underReview",icon:"🔍",bg:"linear-gradient(135deg,#92400e,#f59e0b)", shadow: "rgba(245,158,11,0.3)" },
  { label: "Resolved",   key: "resolved",icon:"✅", bg: "linear-gradient(135deg,#065f46,#10b981)", shadow: "rgba(16,185,129,0.3)" },
];

export default function OrderCareIndex() {
  const { stats, complaints, filters } = useLoaderData();
  const { shop } = useRouteLoaderData("routes/app") || {};
  const qs = shop ? `?shop=${encodeURIComponent(shop)}` : "";

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)", padding: "0 32px",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/logo.png.png" alt="Riaz Impex" style={{ height: 46, width: "auto" }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: 0.2 }}>RIAZ IMPEX</div>
              <div style={{ fontSize: 10, color: "#d4af37", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>Order Care System</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {shop && (
              <div style={{ fontSize: 11, color: "#94a3b8", background: "#f1f5f9", padding: "4px 12px", borderRadius: 20, border: "1px solid #e2e8f0" }}>
                {shop}
              </div>
            )}
            <a href={`/app/order-care/new${qs}`} style={{
              background: "linear-gradient(135deg,#1e3a5f,#2563eb)",
              color: "#fff", padding: "9px 22px", borderRadius: 8,
              textDecoration: "none", fontWeight: 700, fontSize: 13,
              boxShadow: "0 4px 12px rgba(37,99,235,0.35)", letterSpacing: 0.3,
            }}>+ New Case</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 32px" }}>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>Dashboard</h1>
          <p style={{ margin: "3px 0 0", color: "#94a3b8", fontSize: 13 }}>Post-order complaint & resolution management</p>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          {STAT_CONFIG.map((s) => (
            <div key={s.label} style={{
              background: s.bg, borderRadius: 14, padding: "22px 24px",
              boxShadow: `0 8px 24px ${s.shadow}, 0 2px 4px rgba(0,0,0,0.08)`,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -8, right: -8, fontSize: 52, opacity: 0.15 }}>{s.icon}</div>
              <div style={{ fontSize: 38, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{stats[s.key]}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Customer portal banner */}
        {shop && (
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0",
            borderLeft: "4px solid #d4af37",
            borderRadius: 10, padding: "13px 20px", marginBottom: 20,
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <span style={{ fontSize: 16 }}>🔗</span>
            <span style={{ fontSize: 13, color: "#92400e", fontWeight: 700 }}>Customer Portal</span>
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/public/order-care?shop=${encodeURIComponent(shop)}`}
              style={{
                flex: 1, minWidth: 260, padding: "6px 12px",
                border: "1px solid #e2e8f0", borderRadius: 6,
                fontSize: 12, color: "#64748b", background: "#f8fafc", cursor: "text",
              }}
              onClick={(e) => e.target.select()}
            />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Share with customers to submit issues</span>
          </div>
        )}

        {/* Search + Filter */}
        <Form method="get" action={`/app/order-care${qs ? qs + "&" : "?"}`} style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
          padding: "14px 18px", marginBottom: 16,
          display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          {shop && <input type="hidden" name="shop" value={shop} />}
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Search by case ID, order, customer…"
            style={{
              flex: 1, minWidth: 200, padding: "9px 14px",
              border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14,
              color: "#0f172a", background: "#f8fafc",
            }}
          />
          <select
            name="status"
            defaultValue={filters.status}
            style={{
              padding: "9px 14px", border: "1px solid #e2e8f0", borderRadius: 8,
              fontSize: 14, color: "#0f172a", background: "#f8fafc", minWidth: 170,
            }}
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" style={{
            padding: "9px 22px", background: "linear-gradient(135deg,#1e3a5f,#2563eb)",
            color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
          }}>Search</button>
          {(filters.q || filters.status) && (
            <a href={`/app/order-care${qs}`} style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none" }}>Clear</a>
          )}
        </Form>

        {/* Table */}
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
          overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}>
          {complaints.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "#64748b" }}>
                {filters.q || filters.status ? "No cases match your filters" : "No cases yet"}
              </div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>
                {filters.q || filters.status ? "Try adjusting your search or filter." : "When customers raise issues, cases will appear here."}
              </div>
              {!filters.q && !filters.status && (
                <a href={`/app/order-care/new${qs}`} style={{
                  background: "linear-gradient(135deg,#1e3a5f,#2563eb)", color: "#fff",
                  padding: "10px 22px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 14,
                  boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                }}>Create First Case</a>
              )}
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "linear-gradient(135deg,#1e3a5f,#1e40af)" }}>
                  {["Case ID", "Order", "Customer", "Issue", "Status", "Priority", "Source", "Created"].map((h) => (
                    <th key={h} style={{
                      padding: "13px 16px", textAlign: "left",
                      fontWeight: 700, color: "#fff", fontSize: 11,
                      textTransform: "uppercase", letterSpacing: 1,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map((c, i) => (
                  <tr key={c.id}
                    style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
                    onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafbfc"}
                  >
                    <td style={{ padding: "13px 16px" }}>
                      <a href={`/app/order-care/${c.caseId}${qs}`} style={{
                        color: "#1d4ed8", fontWeight: 800, textDecoration: "none",
                        fontFamily: "monospace", fontSize: 12, letterSpacing: 0.5,
                      }}>{c.caseId}</a>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#475569", fontWeight: 500 }}>{c.shopifyOrderName || "—"}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{c.customerName || "—"}</div>
                      <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 1 }}>{c.customerEmail}</div>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#475569" }}>{c.issueType}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        background: STATUS_COLOR[c.status] || "#6b7280",
                        color: "#fff", padding: "3px 11px", borderRadius: 20,
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                        boxShadow: `0 2px 6px ${STATUS_COLOR[c.status]}55`,
                      }}>{c.status}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ color: PRIORITY_COLOR[c.priority] || "#6b7280", fontWeight: 700, fontSize: 12 }}>
                        {c.priority === "Urgent" ? "🔴 " : c.priority === "High" ? "🟡 " : "⚪ "}{c.priority}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700,
                        background: c.source === "customer" ? "#fef3c7" : "#f1f5f9",
                        color: c.source === "customer" ? "#92400e" : "#64748b",
                        border: `1px solid ${c.source === "customer" ? "#fde68a" : "#e2e8f0"}`,
                      }}>
                        {c.source === "customer" ? "Customer" : "Admin"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", color: "#94a3b8", fontSize: 12 }}>
                      {new Date(c.createdAt).toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 32, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png.png" alt="Riaz Impex" style={{ height: 26, width: "auto", opacity: 0.7 }} />
            <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>RIAZ IMPEX — Order Care System</span>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Developed by <span style={{ color: "#d4af37", fontWeight: 700 }}>Mohsin Riaz</span>
          </div>
        </div>

      </div>
    </div>
  );
}
