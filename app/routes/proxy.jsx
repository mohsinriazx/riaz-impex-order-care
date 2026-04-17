import { useState, useRef } from "react";
import { useLoaderData } from "react-router";
import { unauthenticated } from "../shopify.server";
import { createComplaint, getComplaintByCaseId, addAttachment } from "../lib/order-care.server";

const ISSUE_TYPES = [
  "Wrong item received", "Missing item / missing piece", "Damaged on arrival",
  "Wrong size", "Wrong color / style", "Personalization mistake",
  "Delivery issue", "Delivered but not received", "Urgent correction", "Other",
];

const STATUS_COLOR = {
  New: "#3b82f6", "Under Review": "#f59e0b", "Awaiting Customer Reply": "#f59e0b",
  Approved: "#10b981", "In Resolution": "#8b5cf6", Resolved: "#10b981", Closed: "#6b7280",
};

const APP_URL = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") || "https://riaz-impex-order-care.onrender.com";

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || request.headers.get("x-shopify-shop-domain") || "";
  const mode = url.searchParams.get("mode") || "submit";
  const caseId = url.searchParams.get("caseId") || "";
  const email = url.searchParams.get("email") || "";
  const success = url.searchParams.get("success") === "1";

  if (!shop) return { shop: "", error: "no-shop", mode, trackResult: null, success: false, appUrl: APP_URL };

  try { await unauthenticated.admin(shop); } catch (_) {
    return { shop, error: "not-installed", mode, trackResult: null, success: false, appUrl: APP_URL };
  }

  if (mode === "track" && caseId && email) {
    const complaint = await getComplaintByCaseId({ shopDomain: shop, caseId: caseId.toUpperCase() });
    if (!complaint) return { shop, error: null, mode, trackResult: { error: "not-found" }, success: false, appUrl: APP_URL };
    if (complaint.customerEmail.toLowerCase() !== email.trim().toLowerCase())
      return { shop, error: null, mode, trackResult: { error: "email-mismatch" }, success: false, appUrl: APP_URL };
    return { shop, error: null, mode, trackResult: { complaint }, success: false, appUrl: APP_URL };
  }

  return { shop, error: null, mode, trackResult: null, success, appUrl: APP_URL };
}

export async function action({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || request.headers.get("x-shopify-shop-domain") || "";

  if (!shop) return { actionError: "Shop not identified." };

  try { await unauthenticated.admin(shop); } catch (_) {
    return { actionError: "Unable to verify shop." };
  }

  const formData = await request.formData();
  const customerEmail = formData.get("customerEmail")?.trim();
  const issueType = formData.get("issueType")?.trim();
  const message = formData.get("message")?.trim();

  if (!customerEmail || !issueType || !message)
    return { actionError: "Email, issue type, and description are required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
    return { actionError: "Please enter a valid email address." };

  const complaint = await createComplaint({
    shopDomain: shop,
    shopifyOrderName: formData.get("orderName") || undefined,
    customerEmail,
    customerName: formData.get("customerName") || undefined,
    issueType,
    productSummary: formData.get("productSummary") || undefined,
    message,
    priority: "Normal",
    source: "customer",
  });

  const urls = formData.getAll("attachmentUrl");
  const names = formData.getAll("attachmentName");
  const mimes = formData.getAll("attachmentMime");
  for (let i = 0; i < urls.length; i++) {
    if (urls[i]) await addAttachment({ complaintId: complaint.id, fileName: names[i] || `photo-${i + 1}`, url: urls[i], mimeType: mimes[i] || null });
  }

  // Redirect back through the Shopify proxy so customer stays on storefront
  return Response.redirect(`https://${shop}/apps/order-care?success=1&caseId=${complaint.caseId}`, 302);
}

// ─── File uploader ────────────────────────────────────────────────────────────
function FileUploader({ shop, appUrl }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  async function uploadFile(file) {
    const id = Math.random().toString(36).slice(2);
    setFiles((f) => [...f, { id, name: file.name, mime: file.type, status: "uploading", progress: 0, url: "" }]);
    try {
      const params = new URLSearchParams({ shop, filename: file.name, mimeType: file.type || "application/octet-stream", fileSize: String(file.size) });
      const stageRes = await fetch(`${appUrl}/api/staged-upload?${params}`);
      const stageData = await stageRes.json();
      if (!stageRes.ok) throw new Error(stageData.error || "Failed to get upload URL");
      setFiles((f) => f.map((x) => x.id === id ? { ...x, progress: 40 } : x));
      const fd = new FormData();
      stageData.parameters.forEach(({ name, value }) => fd.append(name, value));
      fd.append("file", file);
      const uploadRes = await fetch(stageData.url, { method: "POST", body: fd });
      if (!uploadRes.ok) throw new Error("Upload failed");
      setFiles((f) => f.map((x) => x.id === id ? { ...x, status: "done", progress: 100, url: stageData.resourceUrl } : x));
    } catch (err) {
      setFiles((f) => f.map((x) => x.id === id ? { ...x, status: "error", error: err.message } : x));
    }
  }

  function handleFiles(list) { Array.from(list).forEach(uploadFile); }
  function removeFile(id) { setFiles((f) => f.filter((x) => x.id !== id)); }

  return (
    <div>
      {files.filter((f) => f.status === "done").map((f) => (
        <span key={f.id}>
          <input type="hidden" name="attachmentUrl" value={f.url} />
          <input type="hidden" name="attachmentName" value={f.name} />
          <input type="hidden" name="attachmentMime" value={f.mime} />
        </span>
      ))}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${dragging ? "#2563eb" : "#cbd5e1"}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "#eff6ff" : "#f8fafc", transition: "all 0.2s", marginBottom: 12 }}
      >
        <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{dragging ? "Drop files here" : "Click or drag to upload photos"}</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>JPG, PNG, PDF — multiple files supported</div>
      </div>
      <input ref={inputRef} type="file" multiple accept="image/*,application/pdf" style={{ display: "none" }}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
      {files.map((f) => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, marginBottom: 6 }}>
          <span>{f.mime?.startsWith("image/") ? "🖼" : "📄"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{f.name}</div>
            {f.status === "uploading" && <div style={{ height: 3, background: "#e2e8f0", borderRadius: 2, marginTop: 4 }}><div style={{ height: 3, background: "#2563eb", borderRadius: 2, width: `${f.progress}%`, transition: "width 0.3s" }} /></div>}
            {f.status === "error" && <div style={{ fontSize: 11, color: "#ef4444" }}>{f.error}</div>}
          </div>
          {f.status === "done" && <span style={{ color: "#10b981", fontWeight: 700 }}>✓</span>}
          <button type="button" onClick={() => removeFile(f.id)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 28, marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" };
const h2s = { margin: "0 0 18px", fontSize: 17, fontWeight: 800, color: "#0f172a" };
const field = { marginBottom: 16 };
const label = { display: "block", fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6 };
const inputS = { width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "#f8fafc", boxSizing: "border-box" };
const selectS = { width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "#f8fafc", boxSizing: "border-box" };
const textareaS = { width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, color: "#0f172a", background: "#f8fafc", boxSizing: "border-box", resize: "vertical", minHeight: 130 };
const btn = { width: "100%", padding: "13px 0", background: "linear-gradient(135deg,#1e3a5f,#2563eb)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(37,99,235,0.35)" };
const errBanner = { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "14px 18px", color: "#991b1b", fontSize: 14, marginBottom: 16, fontWeight: 500 };

export default function Proxy() {
  const { shop, error, mode, trackResult, success, caseId: successCaseId, appUrl } = useLoaderData();
  const activeTab = mode === "track" ? "track" : "submit";
  const storeBase = shop ? `https://${shop}/apps/order-care` : "/apps/order-care";
  const proxyAction = `${appUrl}/proxy?shop=${encodeURIComponent(shop)}`;

  if (error) {
    return (
      <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ ...card, maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: "#0f172a" }}>Service Unavailable</h2>
          <p style={{ color: "#94a3b8" }}>Please contact us directly at <a href="mailto:info@riazimpex.com" style={{ color: "#2563eb" }}>info@riazimpex.com</a></p>
        </div>
      </div>
    );
  }

  // Success state
  const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const shownCaseId = urlParams?.get("caseId") || successCaseId || "";

  if (success) {
    return (
      <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: "linear-gradient(135deg,#f0f9ff,#e0f2fe)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "48px 36px", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}>
            <div style={{ width: 72, height: 72, background: "linear-gradient(135deg,#10b981,#34d399)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32, boxShadow: "0 8px 24px rgba(16,185,129,0.35)" }}>✓</div>
            <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, color: "#0f172a" }}>Case Submitted!</h2>
            <p style={{ color: "#64748b", fontSize: 15, margin: "0 0 24px" }}>Your complaint has been received and is being reviewed by our team.</p>
            <div style={{ background: "linear-gradient(135deg,#1e3a5f,#2563eb)", borderRadius: 12, padding: "18px 24px", marginBottom: 24 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Your Case ID</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", fontFamily: "monospace", letterSpacing: 1 }}>{shownCaseId}</div>
            </div>
            <p style={{ color: "#94a3b8", fontSize: 13, marginBottom: 20 }}>Save this ID to track your case. We'll also contact you by email.</p>
            <a href={`${storeBase}?mode=track`} style={{ display: "inline-block", padding: "11px 28px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, color: "#2563eb", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              🔍 Track This Case →
            </a>
          </div>
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <img src={`${appUrl}/logo.png.png`} alt="Riaz Impex" style={{ height: 28 }} />
            <span style={{ color: "#94a3b8", fontSize: 13 }}>Riaz Impex Order Care</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", padding: "0 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={`${appUrl}/logo.png.png`} alt="Riaz Impex" style={{ height: 40 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>RIAZ IMPEX</div>
              <div style={{ fontSize: 10, color: "#d4af37", letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>Order Support</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Need help? <a href="mailto:info@riazimpex.com" style={{ color: "#2563eb", fontWeight: 600 }}>info@riazimpex.com</a></div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%)", padding: "40px 24px 0" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", paddingBottom: 60 }}>
          <h1 style={{ margin: "0 0 10px", fontSize: 30, fontWeight: 900, color: "#fff" }}>Order Issue & Support Centre</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: 15 }}>Submit a complaint or track your existing case — we'll get it sorted.</p>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "-32px auto 0", padding: "0 24px 48px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 6, marginBottom: 20, gap: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          <a href={storeBase} style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", background: activeTab === "submit" ? "linear-gradient(135deg,#1e3a5f,#2563eb)" : "transparent", color: activeTab === "submit" ? "#fff" : "#64748b" }}>📝 Submit Issue</a>
          <a href={`${storeBase}?mode=track`} style={{ flex: 1, textAlign: "center", padding: "11px 0", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", background: activeTab === "track" ? "linear-gradient(135deg,#1e3a5f,#2563eb)" : "transparent", color: activeTab === "track" ? "#fff" : "#64748b" }}>🔍 Track My Case</a>
        </div>

        {activeTab === "track" ? (
          <div>
            <div style={card}>
              <h2 style={h2s}>Enter Your Case Details</h2>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 20px" }}>Enter your Case ID and the email you used when submitting.</p>
              {/* Plain GET form — submits to storefront proxy URL */}
              <form method="get" action={storeBase}>
                <input type="hidden" name="mode" value="track" />
                <div style={field}>
                  <label style={label}>Case ID *</label>
                  <input name="caseId" placeholder="OC-XXXXXX-XXX" style={inputS} required />
                </div>
                <div style={field}>
                  <label style={label}>Email Address *</label>
                  <input name="email" type="email" placeholder="The email you used when submitting" style={inputS} required />
                </div>
                <button type="submit" style={btn}>🔍 Track My Case</button>
              </form>
            </div>

            {trackResult?.error === "not-found" && <div style={errBanner}>Case not found. Please double-check your Case ID.</div>}
            {trackResult?.error === "email-mismatch" && <div style={errBanner}>Email does not match this case. Please check and try again.</div>}
            {trackResult?.complaint && <CaseStatus complaint={trackResult.complaint} />}
          </div>
        ) : (
          <div>
            {/* Plain POST form — submits to app proxy handler */}
            <form method="post" action={proxyAction}>
              <div style={card}>
                <h2 style={h2s}>👤 Your Details</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={field}>
                    <label style={label}>Email Address *</label>
                    <input name="customerEmail" type="email" placeholder="your@email.com" style={inputS} required />
                  </div>
                  <div style={field}>
                    <label style={label}>Full Name</label>
                    <input name="customerName" placeholder="Your name" style={inputS} />
                  </div>
                </div>
              </div>
              <div style={card}>
                <h2 style={h2s}>📦 Order & Issue</h2>
                <div style={field}>
                  <label style={label}>Order Number</label>
                  <input name="orderName" placeholder="#1001" style={inputS} />
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Found in your order confirmation email</div>
                </div>
                <div style={field}>
                  <label style={label}>Issue Type *</label>
                  <select name="issueType" style={selectS} required defaultValue="">
                    <option value="">Select the type of issue…</option>
                    {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={field}>
                  <label style={label}>Product(s) Affected</label>
                  <input name="productSummary" placeholder="e.g. Blue Apron, Size L" style={inputS} />
                </div>
                <div style={field}>
                  <label style={label}>Describe the Issue *</label>
                  <textarea name="message" placeholder="What went wrong? What did you receive vs. what you expected?" style={textareaS} required />
                </div>
              </div>
              <div style={card}>
                <h2 style={h2s}>📸 Evidence Photos / Files</h2>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>Upload photos of the issue — helps us resolve your case faster.</p>
                <FileUploader shop={shop} appUrl={appUrl} />
              </div>
              <button type="submit" style={{ ...btn, fontSize: 16, padding: "15px 0" }}>🚀 Submit Complaint</button>
            </form>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 32, paddingTop: 24, borderTop: "1px solid #e2e8f0" }}>
          <img src={`${appUrl}/logo.png.png`} alt="Riaz Impex" style={{ height: 32, opacity: 0.6, marginBottom: 8 }} />
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>© Riaz Impex · <a href="mailto:info@riazimpex.com" style={{ color: "#94a3b8" }}>info@riazimpex.com</a></div>
          <div style={{ fontSize: 11, color: "#e2e8f0", marginTop: 4 }}>Developed by <span style={{ color: "#d4af37", fontWeight: 700 }}>Mohsin Riaz</span></div>
        </div>
      </div>
    </div>
  );
}

function CaseStatus({ complaint }) {
  const color = STATUS_COLOR[complaint.status] || "#6b7280";
  const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <div style={{ ...card, borderTop: `4px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Case ID</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", fontFamily: "monospace" }}>{complaint.caseId}</div>
        </div>
        <span style={{ background: color, color: "#fff", padding: "6px 18px", borderRadius: 30, fontSize: 13, fontWeight: 800, boxShadow: `0 4px 12px ${color}55` }}>{complaint.status}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 20 }}>
        {[
          ["Issue Type", complaint.issueType],
          ["Submitted", fmt(complaint.createdAt)],
          complaint.shopifyOrderName && ["Order", complaint.shopifyOrderName],
          complaint.resolutionType && ["Resolution", complaint.resolutionType],
          ["Last Updated", fmt(complaint.updatedAt)],
        ].filter(Boolean).map(([l, v]) => (
          <div key={l}><div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>{l}</div><div style={{ fontSize: 14, color: "#1e293b", fontWeight: 600 }}>{v}</div></div>
        ))}
      </div>
      {complaint.customerUpdate ? (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>📢 Update from Our Team</div>
          <div style={{ fontSize: 14, color: "#166534", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{complaint.customerUpdate}</div>
        </div>
      ) : (
        <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>⏳ Your case is under review. We'll contact you by email when there's an update.</div>
        </div>
      )}
    </div>
  );
}
