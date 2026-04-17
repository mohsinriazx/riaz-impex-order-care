import { useState, useRef } from "react";
import { useLoaderData, Form, useNavigation, useActionData, useRouteLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getComplaintByCaseId, updateComplaint } from "../lib/order-care.server";
import { sendCustomerUpdate } from "../lib/email.server";

const STATUSES = ["New", "Under Review", "Awaiting Customer Reply", "Approved", "In Resolution", "Resolved", "Closed"];
const RESOLUTION_TYPES = ["Replacement", "Refund", "Partial Refund", "Rework / Correction", "Goodwill Credit", "No Action Required", "Other"];
const STATUS_COLOR = {
  New: "#2563eb", "Under Review": "#d97706", "Awaiting Customer Reply": "#d97706",
  Approved: "#16a34a", "In Resolution": "#7c3aed", Resolved: "#16a34a", Closed: "#6b7280",
};
const PRIORITY_COLOR = { Normal: "#6b7280", High: "#d97706", Urgent: "#dc2626" };

export async function loader({ request, params }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const complaint = await getComplaintByCaseId({ shopDomain: shop, caseId: params.caseId });
  if (!complaint) throw new Response("Case not found", { status: 404 });
  return { complaint, shop, error: null };
}

export async function action({ request, params }) {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const formData = await request.formData();
  const prevComplaint = await getComplaintByCaseId({ shopDomain: shop, caseId: params.caseId });
  const newStatus = formData.get("status") || undefined;
  const newCustomerUpdate = formData.get("customerUpdate") ?? undefined;

  await updateComplaint({
    shopDomain: shop,
    caseId: params.caseId,
    status: newStatus,
    resolutionType: formData.get("resolutionType") ?? undefined,
    customerUpdate: newCustomerUpdate,
    internalNotes: formData.get("internalNotes") ?? undefined,
    priority: formData.get("priority") || undefined,
  });

  // Send email if: customer update message is non-empty AND (message changed OR status changed)
  const statusChanged = newStatus && newStatus !== prevComplaint?.status;
  const updateChanged = newCustomerUpdate?.trim() && newCustomerUpdate.trim() !== (prevComplaint?.customerUpdate || "").trim();
  const shouldEmail = newCustomerUpdate?.trim() && (statusChanged || updateChanged);

  let emailSent = false;
  if (shouldEmail && prevComplaint) {
    try {
      await sendCustomerUpdate({
        complaint: {
          ...prevComplaint,
          customerUpdate: newCustomerUpdate,
          status: newStatus || prevComplaint.status,
          resolutionType: formData.get("resolutionType") || prevComplaint.resolutionType,
        },
      });
      emailSent = true;
    } catch (_) {}
  }

  return { success: true, emailSent };
}

function fmt(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const S = {
  page: { fontFamily: "sans-serif", padding: 24, background: "#f9fafb", minHeight: "100vh" },
  back: { color: "#6b7280", textDecoration: "none", fontSize: 14 },
  h1: { margin: "4px 0 4px", fontSize: 22, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 10 },
  sub: { margin: 0, fontSize: 13, color: "#6b7280" },
  badge: (color) => ({ display: "inline-block", background: color, color: "#fff", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }),
  layout: { display: "flex", gap: 24, alignItems: "flex-start", marginTop: 24 },
  main: { flex: 1, display: "flex", flexDirection: "column", gap: 16 },
  sidebar: { width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 },
  cardTitle: { margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "#111827" },
  dl: { display: "grid", gridTemplateColumns: "140px 1fr", gap: "8px 16px", fontSize: 14 },
  dt: { color: "#6b7280", fontWeight: 500 },
  dd: { margin: 0, color: "#111827" },
  msgBox: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: 14, fontSize: 14, color: "#374151", whiteSpace: "pre-wrap" },
  field: { marginBottom: 12 },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 4 },
  select: { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, color: "#111827", background: "#fff", width: "100%", boxSizing: "border-box" },
  textarea: { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, color: "#111827", background: "#fff", width: "100%", boxSizing: "border-box", resize: "vertical", minHeight: 90 },
  btn: { width: "100%", padding: "10px 0", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  success: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "10px 14px", color: "#166534", fontSize: 14, marginBottom: 12 },
  errBox: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, padding: "10px 14px", color: "#991b1b", fontSize: 14, marginBottom: 12 },
  attItem: { display: "flex", gap: 8, alignItems: "center", marginBottom: 8, padding: "8px 10px", background: "#f9fafb", borderRadius: 6, border: "1px solid #e5e7eb" },
  attInput: { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#111827", width: "100%", boxSizing: "border-box" },
  attBtn: { padding: "8px 0", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer", width: "100%" },
  uploadBtn: { padding: "8px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  progressBar: (pct) => ({ height: 4, background: "#2563eb", borderRadius: 2, width: `${pct}%`, transition: "width 0.3s" }),
};

function AttachmentSection({ complaint, qs }) {
  const [uploadState, setUploadState] = useState({ status: "idle", progress: 0, error: "" });
  const [urlMode, setUrlMode] = useState(false);
  const fileInputRef = useRef(null);
  const shop = qs.replace("?shop=", "");

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadState({ status: "uploading", progress: 10, error: "" });

    try {
      // Step 1: get staged upload URL
      const params = new URLSearchParams({ shop, filename: file.name, mimeType: file.type, fileSize: String(file.size) });
      const stageRes = await fetch(`/api/staged-upload?${params}`);
      const stageData = await stageRes.json();
      if (!stageRes.ok) throw new Error(stageData.error || "Failed to get upload URL");

      setUploadState({ status: "uploading", progress: 30, error: "" });

      // Step 2: upload to Shopify/S3
      const formData = new FormData();
      stageData.parameters.forEach(({ name, value }) => formData.append(name, value));
      formData.append("file", file);

      const uploadRes = await fetch(stageData.url, { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("File upload to storage failed");

      setUploadState({ status: "uploading", progress: 80, error: "" });

      // Step 3: save attachment record
      const attForm = new FormData();
      attForm.append("intent", "add");
      attForm.append("fileUrl", stageData.resourceUrl);
      attForm.append("fileName", file.name);
      attForm.append("mimeType", file.type);

      await fetch(`/app/order-care/${complaint.caseId}/attachments${qs}`, { method: "POST", body: attForm });

      setUploadState({ status: "done", progress: 100, error: "" });
      // Reload to show new attachment
      window.location.reload();
    } catch (err) {
      setUploadState({ status: "error", progress: 0, error: err.message });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function attIcon(mimeType) {
    if (!mimeType) return "📎";
    if (mimeType.startsWith("image/")) return "🖼";
    if (mimeType === "application/pdf") return "📄";
    if (mimeType.startsWith("video/")) return "🎥";
    return "📎";
  }

  return (
    <div style={S.card}>
      <h2 style={S.cardTitle}>Evidence Attachments</h2>

      {complaint.attachments?.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          {complaint.attachments.map((att) => (
            <div key={att.id} style={S.attItem}>
              <span style={{ fontSize: 16 }}>{attIcon(att.mimeType)}</span>
              <a href={att.url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontSize: 14, flex: 1, wordBreak: "break-all" }}>{att.fileName}</a>
              {att.mimeType && <span style={{ color: "#9ca3af", fontSize: 11, flexShrink: 0 }}>{att.mimeType}</span>}
              <Form method="post" action={`/app/order-care/${complaint.caseId}/attachments${qs}`} style={{ margin: 0, flexShrink: 0 }}>
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={att.id} />
                <button type="submit" style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 13, padding: "2px 6px" }} title="Delete">✕</button>
              </Form>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "#9ca3af", fontSize: 13, marginBottom: 16 }}>No attachments yet.</p>
      )}

      {/* Upload area */}
      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" onClick={() => { setUrlMode(false); fileInputRef.current?.click(); }} style={S.uploadBtn}>
            📁 Upload File
          </button>
          <button type="button" onClick={() => setUrlMode((v) => !v)} style={{ ...S.attBtn, width: "auto", padding: "8px 12px" }}>
            🔗 Paste URL
          </button>
        </div>

        <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.mp4,.mov" />

        {uploadState.status === "uploading" && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Uploading… {uploadState.progress}%</div>
            <div style={{ height: 4, background: "#e5e7eb", borderRadius: 2 }}>
              <div style={S.progressBar(uploadState.progress)} />
            </div>
          </div>
        )}
        {uploadState.status === "done" && (
          <div style={{ fontSize: 12, color: "#16a34a", marginBottom: 10 }}>✓ File uploaded successfully</div>
        )}
        {uploadState.status === "error" && (
          <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>⚠ {uploadState.error}</div>
        )}

        {urlMode && (
          <Form method="post" action={`/app/order-care/${complaint.caseId}/attachments${qs}`}>
            <input type="hidden" name="intent" value="add" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input name="fileUrl" placeholder="Paste file URL (image, PDF, etc.)" style={S.attInput} autoFocus />
              <input name="fileName" placeholder="File name (optional)" style={S.attInput} />
              <button type="submit" style={S.attBtn}>+ Add from URL</button>
            </div>
          </Form>
        )}
      </div>
    </div>
  );
}

export default function CaseDetail() {
  const { complaint, error } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const { shop } = useRouteLoaderData("routes/app") || {};
  const qs = shop ? `?shop=${encodeURIComponent(shop)}` : "";

  if (!complaint) {
    return (
      <div style={{ fontFamily: "sans-serif", padding: 48, textAlign: "center", color: "#6b7280" }}>
        <p style={{ fontSize: 15 }}>
          {error === "no-shop" ? "No shop session — open this app from Shopify admin." : "Session expired."}
          {" "}<a href={`/app/order-care${qs}`} style={{ color: "#2563eb" }}>Return to dashboard</a>
        </p>
      </div>
    );
  }

  const customerDisplay = complaint.customerName
    ? `${complaint.customerName} (${complaint.customerEmail})`
    : complaint.customerEmail;

  return (
    <div style={S.page}>
      <div>
        <a href={`/app/order-care${qs}`} style={S.back}>← All Cases</a>
        <h1 style={S.h1}>
          Case {complaint.caseId}
          <span style={S.badge(STATUS_COLOR[complaint.status] || "#6b7280")}>{complaint.status}</span>
        </h1>
        <p style={S.sub}>Opened {fmt(complaint.createdAt)} · {complaint.issueType} · Source: {complaint.source}</p>
      </div>

      <div style={S.layout}>
        <div style={S.main}>
          <div style={S.card}>
            <h2 style={S.cardTitle}>Case Details</h2>
            <dl style={S.dl}>
              <dt style={S.dt}>Customer</dt><dd style={S.dd}>{customerDisplay}</dd>
              <dt style={S.dt}>Issue Type</dt><dd style={S.dd}>{complaint.issueType}</dd>
              <dt style={S.dt}>Product(s)</dt><dd style={S.dd}>{complaint.productSummary || "—"}</dd>
              <dt style={S.dt}>Order</dt><dd style={S.dd}>{complaint.shopifyOrderName || "—"}</dd>
              {complaint.trackingNumber && (
                <><dt style={S.dt}>Tracking</dt><dd style={S.dd}>{complaint.trackingNumber}{complaint.carrier ? ` via ${complaint.carrier}` : ""}</dd></>
              )}
              <dt style={S.dt}>Priority</dt>
              <dd style={S.dd}><span style={{ color: PRIORITY_COLOR[complaint.priority] || "#6b7280", fontWeight: 600 }}>{complaint.priority}</span></dd>
              <dt style={S.dt}>Source</dt><dd style={S.dd}>{complaint.source}</dd>
              <dt style={S.dt}>Opened</dt><dd style={S.dd}>{fmt(complaint.createdAt)}</dd>
              <dt style={S.dt}>Last Updated</dt><dd style={S.dd}>{fmt(complaint.updatedAt)}</dd>
              {complaint.resolutionType && <><dt style={S.dt}>Resolution</dt><dd style={S.dd}>{complaint.resolutionType}</dd></>}
            </dl>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Complaint Message</div>
              <div style={S.msgBox}>{complaint.message}</div>
            </div>
          </div>

          {complaint.internalNotes && (
            <div style={S.card}>
              <h2 style={S.cardTitle}>Internal Notes</h2>
              <div style={S.msgBox}>{complaint.internalNotes}</div>
            </div>
          )}

          {complaint.customerUpdate && (
            <div style={S.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h2 style={{ ...S.cardTitle, margin: 0 }}>Customer-Visible Update</h2>
                <span style={S.badge("#2563eb")}>Visible to customer</span>
              </div>
              <div style={S.msgBox}>{complaint.customerUpdate}</div>
            </div>
          )}

          <AttachmentSection complaint={complaint} qs={qs} />
        </div>

        <div style={S.sidebar}>
          <div style={S.card}>
            {actionData?.success && (
              <div style={S.success}>
                Case updated.{actionData.emailSent ? " Customer email sent." : ""}
              </div>
            )}
            {actionData?.error && <div style={S.errBox}>{actionData.error}</div>}
            <h2 style={S.cardTitle}>Update Case</h2>
            <Form method="post" action={`/app/order-care/${complaint.caseId}${qs}`}>
              <div style={S.field}>
                <label style={S.label}>Status</label>
                <select name="status" defaultValue={complaint.status} style={S.select}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Resolution Type</label>
                <select name="resolutionType" defaultValue={complaint.resolutionType || ""} style={S.select}>
                  <option value="">Not set</option>
                  {RESOLUTION_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Priority</label>
                <select name="priority" defaultValue={complaint.priority} style={S.select}>
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div style={S.field}>
                <label style={S.label}>Internal Notes</label>
                <textarea name="internalNotes" defaultValue={complaint.internalNotes || ""} placeholder="Notes visible only to your team…" style={S.textarea} />
              </div>
              <div style={S.field}>
                <label style={S.label}>Customer-Visible Update</label>
                <textarea name="customerUpdate" defaultValue={complaint.customerUpdate || ""} placeholder="Update message shown to the customer — email sent automatically when changed…" style={S.textarea} />
              </div>
              <button type="submit" style={S.btn} disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save Changes"}
              </button>
            </Form>
          </div>

          <div style={S.card}>
            <h2 style={S.cardTitle}>Case Info</h2>
            <dl style={{ ...S.dl, gridTemplateColumns: "100px 1fr" }}>
              <dt style={S.dt}>Case ID</dt><dd style={S.dd}>{complaint.caseId}</dd>
              <dt style={S.dt}>Status</dt><dd style={S.dd}>{complaint.status}</dd>
              <dt style={S.dt}>Priority</dt><dd style={S.dd}>{complaint.priority}</dd>
              <dt style={S.dt}>Source</dt><dd style={S.dd}>{complaint.source}</dd>
              <dt style={S.dt}>Files</dt><dd style={S.dd}>{complaint.attachments?.length ?? 0}</dd>
            </dl>
          </div>

          <div style={S.card}>
            <h2 style={S.cardTitle}>Customer Portal Link</h2>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px" }}>Share with customers to let them submit issues:</p>
            <input
              readOnly
              value="https://riazimpex.com/apps/order-care"
              style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 11, color: "#6b7280", width: "100%", boxSizing: "border-box", cursor: "text" }}
              onClick={(e) => e.target.select()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
