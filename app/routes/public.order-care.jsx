import { useState, useRef } from "react";
import { useLoaderData, useActionData, Form, useNavigation, useSearchParams } from "react-router";
import { unauthenticated } from "../shopify.server";
import { createComplaint, getComplaintByCaseId, addAttachment } from "../lib/order-care.server";

const ISSUE_TYPES = [
  "Wrong item received", "Missing item / missing piece", "Damaged on arrival",
  "Wrong size", "Wrong color / style", "Personalization mistake",
  "Delivery issue", "Delivered but not received", "Urgent correction", "Other",
];

const STATUS_COLOR = {
  New: "#2563eb", "Under Review": "#d97706", "Awaiting Customer Reply": "#d97706",
  Approved: "#16a34a", "In Resolution": "#7c3aed", Resolved: "#16a34a", Closed: "#6b7280",
};

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  const mode = url.searchParams.get("mode") || "submit";
  const caseId = url.searchParams.get("caseId") || "";
  const email = url.searchParams.get("email") || "";

  if (!shop) return { shop: "", shopError: "no-shop", mode, trackResult: null };

  try {
    await unauthenticated.admin(shop);
  } catch (_) {
    return { shop, shopError: "not-installed", mode, trackResult: null };
  }

  if (mode === "track" && caseId && email) {
    const complaint = await getComplaintByCaseId({ shopDomain: shop, caseId: caseId.toUpperCase() });
    if (!complaint) {
      return { shop, shopError: null, mode, trackResult: { error: "not-found" } };
    }
    if (complaint.customerEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return { shop, shopError: null, mode, trackResult: { error: "email-mismatch" } };
    }
    return { shop, shopError: null, mode, trackResult: { complaint } };
  }

  return { shop, shopError: null, mode, trackResult: null };
}

export async function action({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  if (!shop) return { success: false, error: "Shop not identified. Please use the link provided by the seller." };

  try {
    await unauthenticated.admin(shop);
  } catch (_) {
    return { success: false, error: "Unable to verify shop. Please contact the seller." };
  }

  const formData = await request.formData();
  const customerEmail = formData.get("customerEmail")?.trim();
  const issueType = formData.get("issueType")?.trim();
  const message = formData.get("message")?.trim();

  if (!customerEmail || !issueType || !message) {
    return { success: false, error: "Email, issue type, and description are required." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

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

  // Save any pre-uploaded attachments
  const urls = formData.getAll("attachmentUrl");
  const names = formData.getAll("attachmentName");
  const mimes = formData.getAll("attachmentMime");
  for (let i = 0; i < urls.length; i++) {
    if (urls[i]) {
      await addAttachment({ complaintId: complaint.id, fileName: names[i] || `photo-${i + 1}`, url: urls[i], mimeType: mimes[i] || null });
    }
  }

  return { success: true, caseId: complaint.caseId };
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page: { fontFamily: "sans-serif", background: "#f9fafb", minHeight: "100vh", padding: "40px 16px" },
  wrap: { maxWidth: 680, margin: "0 auto" },
  header: { marginBottom: 28, textAlign: "center" },
  logo: { fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 4 },
  sub: { color: "#6b7280", fontSize: 14 },
  tabs: { display: "flex", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 },
  tab: (active) => ({
    flex: 1, padding: "10px 0", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
    background: active ? "#2563eb" : "transparent", color: active ? "#fff" : "#6b7280",
  }),
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 28, marginBottom: 16 },
  h2: { margin: "0 0 18px", fontSize: 17, fontWeight: 700, color: "#111827" },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 5 },
  req: { color: "#dc2626", marginLeft: 2 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box", resize: "vertical", minHeight: 130 },
  select: { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, color: "#111827", background: "#fff", boxSizing: "border-box" },
  btn: { width: "100%", padding: "12px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "12px 0", background: "#93c5fd", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700 },
  error: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "14px 16px", color: "#991b1b", fontSize: 14, marginBottom: 16 },
  success: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 32, textAlign: "center" },
  uploadZone: { border: "2px dashed #d1d5db", borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", marginBottom: 12, background: "#fafafa" },
  uploadZoneActive: { border: "2px dashed #2563eb", borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", marginBottom: 12, background: "#eff6ff" },
  fileItem: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, marginBottom: 6 },
  progressBar: (pct) => ({ height: 4, background: "#2563eb", borderRadius: 2, width: `${pct}%`, transition: "width 0.2s" }),
  trackCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 28 },
  statusBadge: (color) => ({ display: "inline-block", background: color, color: "#fff", padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700 }),
  dl: { display: "grid", gridTemplateColumns: "140px 1fr", gap: "10px 16px", fontSize: 14 },
  dt: { color: "#6b7280", fontWeight: 500 },
  dd: { margin: 0, color: "#111827" },
  msgBox: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: 14, fontSize: 14, color: "#374151", whiteSpace: "pre-wrap", marginTop: 4 },
};

// ─── File upload component ────────────────────────────────────────────────────
function FileUploader({ shop }) {
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  async function uploadFile(file) {
    const id = Math.random().toString(36).slice(2);
    setFiles((f) => [...f, { id, name: file.name, mime: file.type, status: "uploading", progress: 0, url: "" }]);

    try {
      const params = new URLSearchParams({ shop, filename: file.name, mimeType: file.type || "application/octet-stream", fileSize: String(file.size) });
      const stageRes = await fetch(`/api/staged-upload?${params}`);
      const stageData = await stageRes.json();
      if (!stageRes.ok) throw new Error(stageData.error || "Failed to get upload URL");

      setFiles((f) => f.map((x) => x.id === id ? { ...x, progress: 30 } : x));

      const fd = new FormData();
      stageData.parameters.forEach(({ name, value }) => fd.append(name, value));
      fd.append("file", file);
      const uploadRes = await fetch(stageData.url, { method: "POST", body: fd });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      setFiles((f) => f.map((x) => x.id === id ? { ...x, status: "done", progress: 100, url: stageData.resourceUrl } : x));
    } catch (err) {
      setFiles((f) => f.map((x) => x.id === id ? { ...x, status: "error", error: err.message } : x));
    }
  }

  function handleFiles(fileList) {
    Array.from(fileList).forEach((f) => uploadFile(f));
  }

  function removeFile(id) {
    setFiles((f) => f.filter((x) => x.id !== id));
  }

  function fileIcon(mime) {
    if (!mime) return "📎";
    if (mime.startsWith("image/")) return "🖼";
    if (mime === "application/pdf") return "📄";
    return "📎";
  }

  const allDone = files.length === 0 || files.every((f) => f.status === "done" || f.status === "error");
  const hasPending = files.some((f) => f.status === "uploading");

  return (
    <div>
      {/* Hidden inputs for submitted URLs */}
      {files.filter((f) => f.status === "done").map((f) => (
        <span key={f.id}>
          <input type="hidden" name="attachmentUrl" value={f.url} />
          <input type="hidden" name="attachmentName" value={f.name} />
          <input type="hidden" name="attachmentMime" value={f.mime} />
        </span>
      ))}

      <div
        style={dragging ? S.uploadZoneActive : S.uploadZone}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 2 }}>
          {dragging ? "Drop files here" : "Click to add photos or files"}
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>JPG, PNG, PDF — up to multiple files</div>
      </div>
      <input ref={inputRef} type="file" multiple accept="image/*,application/pdf" style={{ display: "none" }}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />

      {files.map((f) => (
        <div key={f.id} style={S.fileItem}>
          <span>{fileIcon(f.mime)}</span>
          <span style={{ flex: 1, fontSize: 13, color: "#374151", wordBreak: "break-all" }}>{f.name}</span>
          {f.status === "uploading" && (
            <div style={{ width: 80 }}>
              <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2 }}>
                <div style={S.progressBar(f.progress)} />
              </div>
            </div>
          )}
          {f.status === "done" && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>✓</span>}
          {f.status === "error" && <span style={{ fontSize: 11, color: "#dc2626" }}>Failed</span>}
          <button type="button" onClick={() => removeFile(f.id)}
            style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      ))}

      {hasPending && (
        <div style={{ fontSize: 12, color: "#d97706", marginTop: 4 }}>⏳ Please wait for uploads to finish before submitting.</div>
      )}

      {/* Expose pending state so parent can disable submit */}
      <input type="hidden" name="_uploadsPending" value={hasPending ? "1" : "0"} />
    </div>
  );
}

// ─── Tracking view ────────────────────────────────────────────────────────────
function TrackView({ shop, trackResult }) {
  const [params] = useSearchParams();
  const prefillCaseId = params.get("caseId") || "";
  const prefillEmail = params.get("email") || "";

  return (
    <div>
      <div style={S.card}>
        <h2 style={S.h2}>Track Your Case</h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 18px" }}>
          Enter your Case ID (from your confirmation) and the email you used when submitting.
        </p>
        <form method="get" action="/public/order-care">
          <input type="hidden" name="shop" value={shop} />
          <input type="hidden" name="mode" value="track" />
          <div style={S.field}>
            <label style={S.label}>Case ID<span style={S.req}>*</span></label>
            <input name="caseId" defaultValue={prefillCaseId} placeholder="OC-XXXXXX-XXX" style={S.input} required />
          </div>
          <div style={S.field}>
            <label style={S.label}>Email Address<span style={S.req}>*</span></label>
            <input name="email" type="email" defaultValue={prefillEmail} placeholder="The email you submitted with" style={S.input} required />
          </div>
          <button type="submit" style={S.btn}>Track Case</button>
        </form>
      </div>

      {trackResult?.error === "not-found" && (
        <div style={S.error}>Case not found. Please check your Case ID and try again.</div>
      )}
      {trackResult?.error === "email-mismatch" && (
        <div style={S.error}>Email address does not match the case. Please check and try again.</div>
      )}

      {trackResult?.complaint && <CaseStatus complaint={trackResult.complaint} />}
    </div>
  );
}

function CaseStatus({ complaint }) {
  const statusColor = STATUS_COLOR[complaint.status] || "#6b7280";
  const fmt = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div style={S.trackCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, marginBottom: 2 }}>CASE ID</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{complaint.caseId}</div>
        </div>
        <span style={S.statusBadge(statusColor)}>{complaint.status}</span>
      </div>

      <dl style={S.dl}>
        <dt style={S.dt}>Issue Type</dt><dd style={S.dd}>{complaint.issueType}</dd>
        {complaint.shopifyOrderName && <><dt style={S.dt}>Order</dt><dd style={S.dd}>{complaint.shopifyOrderName}</dd></>}
        {complaint.productSummary && <><dt style={S.dt}>Product</dt><dd style={S.dd}>{complaint.productSummary}</dd></>}
        {complaint.resolutionType && <><dt style={S.dt}>Resolution</dt><dd style={S.dd}>{complaint.resolutionType}</dd></>}
        <dt style={S.dt}>Submitted</dt><dd style={S.dd}>{fmt(complaint.createdAt)}</dd>
        <dt style={S.dt}>Last Updated</dt><dd style={S.dd}>{fmt(complaint.updatedAt)}</dd>
        <dt style={S.dt}>Files Attached</dt><dd style={S.dd}>{complaint.attachments?.length ?? 0}</dd>
      </dl>

      {complaint.customerUpdate ? (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Latest Update from Us</div>
          <div style={S.msgBox}>{complaint.customerUpdate}</div>
        </div>
      ) : (
        <div style={{ marginTop: 20, padding: "12px 16px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, fontSize: 13, color: "#92400e" }}>
          ⏳ Your case is being reviewed. We will update this page and contact you by email when there is news.
        </div>
      )}

      {complaint.attachments?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Your Attachments</div>
          {complaint.attachments.map((a) => (
            <div key={a.id} style={{ fontSize: 13, marginBottom: 4 }}>
              <a href={a.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>{a.fileName}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PublicOrderCare() {
  const { shop, shopError, mode, trackResult } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const [uploadsPending, setUploadsPending] = useState(false);

  const isSubmitting = navigation.state === "submitting";
  const activeTab = mode === "track" ? "track" : "submit";

  if (shopError === "no-shop") {
    return (
      <div style={S.page}><div style={{ ...S.card, textAlign: "center", maxWidth: 480, margin: "80px auto" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔗</div>
        <h2 style={{ color: "#111827" }}>Invalid Link</h2>
        <p style={{ color: "#6b7280" }}>Please use the complaint link provided by the seller.</p>
      </div></div>
    );
  }

  if (shopError === "not-installed") {
    return (
      <div style={S.page}><div style={{ ...S.card, textAlign: "center", maxWidth: 480, margin: "80px auto" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ color: "#111827" }}>Service Unavailable</h2>
        <p style={{ color: "#6b7280" }}>The complaint system for this shop is not currently active. Please contact the seller directly.</p>
      </div></div>
    );
  }

  if (actionData?.success) {
    return (
      <div style={S.page}><div style={S.wrap}>
        <div style={S.success}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Case Submitted</div>
          <p style={{ color: "#6b7280", fontSize: 15 }}>Your complaint has been received. Note your Case ID below.</p>
          <div style={{ display: "inline-block", marginTop: 12, padding: "10px 24px", background: "#2563eb", color: "#fff", borderRadius: 8, fontWeight: 800, fontSize: 20, letterSpacing: 1 }}>
            {actionData.caseId}
          </div>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 16 }}>Save this ID to track your case status.</p>
          <a
            href={`/public/order-care?shop=${encodeURIComponent(shop)}&mode=track&caseId=${actionData.caseId}&email=${encodeURIComponent("")}`}
            style={{ display: "inline-block", marginTop: 8, color: "#2563eb", fontSize: 14, textDecoration: "underline" }}
          >
            Track this case →
          </a>
        </div>
      </div></div>
    );
  }

  const shopQs = `shop=${encodeURIComponent(shop)}`;

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.header}>
          <div style={S.logo}>Order Issue & Support</div>
          <div style={S.sub}>Submit a complaint or track your existing case</div>
        </div>

        {/* Tab nav */}
        <div style={S.tabs}>
          <a href={`/public/order-care?${shopQs}&mode=submit`} style={{ ...S.tab(activeTab === "submit"), textDecoration: "none", textAlign: "center", display: "block" }}>
            📝 Submit Issue
          </a>
          <a href={`/public/order-care?${shopQs}&mode=track`} style={{ ...S.tab(activeTab === "track"), textDecoration: "none", textAlign: "center", display: "block" }}>
            🔍 Track My Case
          </a>
        </div>

        {activeTab === "track" ? (
          <TrackView shop={shop} trackResult={trackResult} />
        ) : (
          <>
            {actionData?.error && <div style={S.error}>{actionData.error}</div>}

            <Form method="post" action={`/public/order-care?${shopQs}`}>
              <div style={S.card}>
                <h2 style={S.h2}>Your Details</h2>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ ...S.field, flex: 1, minWidth: 200 }}>
                    <label style={S.label}>Email Address<span style={S.req}>*</span></label>
                    <input name="customerEmail" type="email" placeholder="your@email.com" style={S.input} required />
                  </div>
                  <div style={{ ...S.field, flex: 1, minWidth: 200 }}>
                    <label style={S.label}>Your Name</label>
                    <input name="customerName" placeholder="Full name" style={S.input} />
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <h2 style={S.h2}>Order & Issue</h2>
                <div style={S.field}>
                  <label style={S.label}>Order Number</label>
                  <input name="orderName" placeholder="#1001" style={S.input} />
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>Found in your order confirmation email</div>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Issue Type<span style={S.req}>*</span></label>
                  <select name="issueType" style={S.select} required defaultValue="">
                    <option value="">Select the type of issue…</option>
                    {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={S.field}>
                  <label style={S.label}>Product(s) Affected</label>
                  <input name="productSummary" placeholder="e.g. Blue Apron, Size L" style={S.input} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Describe the Issue<span style={S.req}>*</span></label>
                  <textarea name="message" placeholder="What went wrong? What did you receive vs. what you expected?" style={S.textarea} required />
                </div>
              </div>

              <div style={S.card}>
                <h2 style={S.h2}>Evidence Photos / Files</h2>
                <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 14px" }}>
                  Upload photos showing the issue — damaged item, wrong product, etc. This helps us resolve your case faster.
                </p>
                <FileUploader shop={shop} />
              </div>

              <button
                type="submit"
                style={isSubmitting ? S.btnDisabled : S.btn}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting…" : "Submit Complaint"}
              </button>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
