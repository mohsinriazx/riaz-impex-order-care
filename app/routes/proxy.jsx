import { createComplaint, getComplaintByCaseId, addAttachment } from "../lib/order-care.server";

const APP_URL = process.env.SHOPIFY_APP_URL?.replace(/\/$/, "") || "https://riaz-impex-order-care.onrender.com";

const ISSUE_TYPES = [
  "Wrong item received", "Missing item / missing piece", "Damaged on arrival",
  "Wrong size", "Wrong color / style", "Personalization mistake",
  "Delivery issue", "Delivered but not received", "Urgent correction", "Other",
];

const STATUS_COLOR = {
  New: "#3b82f6", "Under Review": "#f59e0b", "Awaiting Customer Reply": "#f59e0b",
  Approved: "#10b981", "In Resolution": "#8b5cf6", Resolved: "#10b981", Closed: "#6b7280",
};

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || request.headers.get("x-shopify-shop-domain") || "";
  const mode = url.searchParams.get("mode") || "submit";
  const success = url.searchParams.get("success") === "1";
  const caseId = url.searchParams.get("caseId") || "";
  const email = url.searchParams.get("email") || "";
  const actionError = url.searchParams.get("error") || "";

  let trackResult = null;
  if (mode === "track" && caseId && email) {
    try {
      const complaint = await getComplaintByCaseId({ shopDomain: shop, caseId: caseId.toUpperCase() });
      if (!complaint) trackResult = { error: "not-found" };
      else if (complaint.customerEmail.toLowerCase() !== email.trim().toLowerCase())
        trackResult = { error: "email-mismatch" };
      else trackResult = { complaint };
    } catch (_) {
      trackResult = { error: "not-found" };
    }
  }

  const storeBase = shop ? `https://${shop}/apps/order-care` : "";
  const html = buildHtml({ shop, mode, success, caseId, trackResult, storeBase, appUrl: APP_URL, actionError });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function action({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || request.headers.get("x-shopify-shop-domain") || "";
  const storeBase = shop ? `https://${shop}/apps/order-care` : "";

  let formData;
  try { formData = await request.formData(); }
  catch (_) {
    return Response.redirect(`${storeBase}?error=${encodeURIComponent("Failed to read form data.")}`, 302);
  }

  const customerEmail = formData.get("customerEmail")?.trim();
  const issueType = formData.get("issueType")?.trim();
  const message = formData.get("message")?.trim();

  if (!customerEmail || !issueType || !message) {
    return Response.redirect(`${storeBase}?error=${encodeURIComponent("Email, issue type, and description are required.")}`, 302);
  }

  try {
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

    return Response.redirect(`${storeBase}?success=1&caseId=${complaint.caseId}`, 302);
  } catch (e) {
    console.error("Proxy action error:", e);
    return Response.redirect(`${storeBase}?error=${encodeURIComponent("Failed to submit. Please try again.")}`, 302);
  }
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────
function buildHtml({ shop, mode, success, caseId, trackResult, storeBase, appUrl, actionError }) {
  const isTrack = mode === "track";
  const proxyAction = `${appUrl}/proxy?shop=${encodeURIComponent(shop)}`;

  const fmtDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
    catch (_) { return d; }
  };

  let bodyContent = "";

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success && caseId) {
    bodyContent = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:80vh;padding:24px">
        <div style="max-width:520px;width:100%;text-align:center">
          <div style="background:#fff;border-radius:20px;padding:48px 36px;box-shadow:0 20px 60px rgba(0,0,0,0.1)">
            <div style="width:72px;height:72px;background:linear-gradient(135deg,#10b981,#34d399);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:32px;box-shadow:0 8px 24px rgba(16,185,129,0.35)">✓</div>
            <h2 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#0f172a">Case Submitted!</h2>
            <p style="color:#64748b;font-size:15px;margin:0 0 24px">Your complaint has been received and is being reviewed by our team.</p>
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;padding:18px 24px;margin-bottom:24px">
              <div style="font-size:11px;color:rgba(255,255,255,0.7);font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px">Your Case ID</div>
              <div style="font-size:24px;font-weight:900;color:#fff;font-family:monospace;letter-spacing:1px">${caseId}</div>
            </div>
            <p style="color:#94a3b8;font-size:13px;margin-bottom:20px">Save this ID to track your case. We'll also contact you by email.</p>
            <a href="${storeBase}?mode=track" style="display:inline-block;padding:11px 28px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;color:#2563eb;font-weight:700;font-size:14px;text-decoration:none">🔍 Track This Case →</a>
          </div>
          <div style="margin-top:24px;display:flex;align-items:center;justify-content:center;gap:10px">
            <img src="${appUrl}/logo.png.png" alt="Riaz Impex" style="height:28px" onerror="this.style.display='none'">
            <span style="color:#94a3b8;font-size:13px">Riaz Impex Order Care</span>
          </div>
        </div>
      </div>`;

  // ── Track tab ───────────────────────────────────────────────────────────────
  } else if (isTrack) {
    let trackSection = "";
    if (trackResult?.error === "not-found") {
      trackSection = `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px 18px;color:#991b1b;font-size:14px;margin-bottom:16px;font-weight:500">Case not found. Please double-check your Case ID.</div>`;
    } else if (trackResult?.error === "email-mismatch") {
      trackSection = `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px 18px;color:#991b1b;font-size:14px;margin-bottom:16px;font-weight:500">Email does not match this case. Please check and try again.</div>`;
    } else if (trackResult?.complaint) {
      const c = trackResult.complaint;
      const color = STATUS_COLOR[c.status] || "#6b7280";
      const updateHtml = c.customerUpdate
        ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px"><div style="font-size:12px;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📢 Update from Our Team</div><div style="font-size:14px;color:#166534;white-space:pre-wrap;line-height:1.6">${esc(c.customerUpdate)}</div></div>`
        : `<div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 18px"><div style="font-size:13px;color:#92400e;font-weight:600">⏳ Your case is under review. We'll contact you by email when there's an update.</div></div>`;
      trackSection = `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;margin-bottom:16px;box-shadow:0 4px 20px rgba(0,0,0,0.06);border-top:4px solid ${color}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;gap:12px">
            <div><div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Case ID</div><div style="font-size:22px;font-weight:900;color:#0f172a;font-family:monospace">${esc(c.caseId)}</div></div>
            <span style="background:${color};color:#fff;padding:6px 18px;border-radius:30px;font-size:13px;font-weight:800">${esc(c.status)}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:20px">
            <div><div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px">Issue Type</div><div style="font-size:14px;color:#1e293b;font-weight:600">${esc(c.issueType)}</div></div>
            <div><div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px">Submitted</div><div style="font-size:14px;color:#1e293b;font-weight:600">${fmtDate(c.createdAt)}</div></div>
            ${c.shopifyOrderName ? `<div><div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px">Order</div><div style="font-size:14px;color:#1e293b;font-weight:600">${esc(c.shopifyOrderName)}</div></div>` : ""}
            <div><div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px">Last Updated</div><div style="font-size:14px;color:#1e293b;font-weight:600">${fmtDate(c.updatedAt)}</div></div>
          </div>
          ${updateHtml}
        </div>`;
    }

    bodyContent = tabLayout({ storeBase, activeTab: "track", content: `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;margin-bottom:16px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
        <h2 style="margin:0 0 8px;font-size:17px;font-weight:800;color:#0f172a">Enter Your Case Details</h2>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 20px">Enter your Case ID and the email you used when submitting.</p>
        <form method="get" action="${storeBase}">
          <input type="hidden" name="mode" value="track">
          <div style="margin-bottom:16px"><label style="display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px">Case ID *</label><input name="caseId" placeholder="OC-XXXXXX-XXX" required style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;background:#f8fafc;box-sizing:border-box"></div>
          <div style="margin-bottom:16px"><label style="display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px">Email Address *</label><input name="email" type="email" placeholder="The email you used when submitting" required style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;background:#f8fafc;box-sizing:border-box"></div>
          <button type="submit" style="width:100%;padding:13px 0;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer">🔍 Track My Case</button>
        </form>
      </div>
      ${trackSection}
    ` });

  // ── Submit tab ──────────────────────────────────────────────────────────────
  } else {
    const errorBanner = actionError
      ? `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px 18px;color:#991b1b;font-size:14px;margin-bottom:16px;font-weight:500">${esc(actionError)}</div>`
      : "";

    const issueOptions = ISSUE_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");

    bodyContent = tabLayout({ storeBase, activeTab: "submit", content: `
      ${errorBanner}
      <form id="complaintForm" method="post" action="${proxyAction}">
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;margin-bottom:16px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
          <h2 style="margin:0 0 18px;font-size:17px;font-weight:800;color:#0f172a">👤 Your Details</h2>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div><label style="display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px">Email Address *</label><input name="customerEmail" type="email" placeholder="your@email.com" required style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;background:#f8fafc;box-sizing:border-box"></div>
            <div><label style="display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px">Full Name</label><input name="customerName" placeholder="Your name" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;background:#f8fafc;box-sizing:border-box"></div>
          </div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;margin-bottom:16px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
          <h2 style="margin:0 0 18px;font-size:17px;font-weight:800;color:#0f172a">📦 Order & Issue</h2>
          <div style="margin-bottom:16px"><label style="display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px">Order Number</label><input name="orderName" placeholder="#1001" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;background:#f8fafc;box-sizing:border-box"><div style="font-size:11px;color:#94a3b8;margin-top:4px">Found in your order confirmation email</div></div>
          <div style="margin-bottom:16px"><label style="display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px">Issue Type *</label><select name="issueType" required style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;background:#f8fafc;box-sizing:border-box"><option value="">Select the type of issue…</option>${issueOptions}</select></div>
          <div style="margin-bottom:16px"><label style="display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px">Product(s) Affected</label><input name="productSummary" placeholder="e.g. Blue Apron, Size L" style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;background:#f8fafc;box-sizing:border-box"></div>
          <div style="margin-bottom:16px"><label style="display:block;font-size:13px;font-weight:700;color:#374151;margin-bottom:6px">Describe the Issue *</label><textarea name="message" placeholder="What went wrong? What did you receive vs. what you expected?" required style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#0f172a;background:#f8fafc;box-sizing:border-box;resize:vertical;min-height:130px"></textarea></div>
        </div>
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;margin-bottom:16px;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
          <h2 style="margin:0 0 8px;font-size:17px;font-weight:800;color:#0f172a">📸 Evidence Photos / Files</h2>
          <p style="font-size:13px;color:#94a3b8;margin:0 0 16px">Upload photos of the issue — helps us resolve your case faster.</p>
          <div id="dropzone" style="border:2px dashed #cbd5e1;border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;background:#f8fafc;transition:all .2s;margin-bottom:12px" onclick="document.getElementById('fileInput').click()" ondragover="event.preventDefault();this.style.borderColor='#2563eb';this.style.background='#eff6ff'" ondragleave="this.style.borderColor='#cbd5e1';this.style.background='#f8fafc'" ondrop="event.preventDefault();this.style.borderColor='#cbd5e1';this.style.background='#f8fafc';handleFiles(event.dataTransfer.files)">
            <div style="font-size:36px;margin-bottom:8px">📸</div>
            <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:4px">Click or drag to upload photos</div>
            <div style="font-size:12px;color:#94a3b8">JPG, PNG, PDF — multiple files supported</div>
          </div>
          <input id="fileInput" type="file" multiple accept="image/*,application/pdf" style="display:none" onchange="handleFiles(this.files);this.value=''">
          <div id="fileList"></div>
          <div id="hiddenInputs"></div>
        </div>
        <button type="submit" id="submitBtn" style="width:100%;padding:15px 0;background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 6px 18px rgba(37,99,235,0.35)">🚀 Submit Complaint</button>
      </form>
    ` });
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order Support — Riaz Impex</title>
<style>*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc}</style>
</head>
<body>
<!-- Header -->
<div style="background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 8px rgba(0,0,0,0.06);padding:0 24px">
  <div style="max-width:760px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:64px">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="${appUrl}/logo.png.png" alt="Riaz Impex" style="height:40px" onerror="this.style.display='none'">
      <div><div style="font-size:15px;font-weight:800;color:#0f172a">RIAZ IMPEX</div><div style="font-size:10px;color:#d4af37;letter-spacing:2px;font-weight:700;text-transform:uppercase">Order Support</div></div>
    </div>
    <div style="font-size:12px;color:#94a3b8">Need help? <a href="mailto:info@riazimpex.com" style="color:#2563eb;font-weight:600">info@riazimpex.com</a></div>
  </div>
</div>
<!-- Hero -->
<div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:40px 24px 0">
  <div style="max-width:760px;margin:0 auto;text-align:center;padding-bottom:60px">
    <h1 style="margin:0 0 10px;font-size:30px;font-weight:900;color:#fff">Order Issue & Support Centre</h1>
    <p style="margin:0;color:rgba(255,255,255,0.75);font-size:15px">Submit a complaint or track your existing case — we'll get it sorted.</p>
  </div>
</div>
<!-- Content -->
<div style="max-width:760px;margin:-32px auto 0;padding:0 24px 48px">
  ${bodyContent}
</div>
<!-- Footer -->
<div style="text-align:center;padding:24px;border-top:1px solid #e2e8f0;margin-top:16px">
  <img src="${appUrl}/logo.png.png" alt="Riaz Impex" style="height:32px;opacity:.6;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto" onerror="this.style.display='none'">
  <div style="font-size:12px;color:#cbd5e1">© Riaz Impex · <a href="mailto:info@riazimpex.com" style="color:#94a3b8">info@riazimpex.com</a></div>
  <div style="font-size:11px;color:#e2e8f0;margin-top:4px">Developed by <span style="color:#d4af37;font-weight:700">Mohsin Riaz</span></div>
</div>

<script>
var SHOP = ${JSON.stringify(shop)};
var APP_URL = ${JSON.stringify(appUrl)};

function handleFiles(files) {
  Array.from(files).forEach(uploadFile);
}

function uploadFile(file) {
  var id = Math.random().toString(36).slice(2);
  var item = document.createElement('div');
  item.id = 'file-' + id;
  item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px';
  item.innerHTML = '<span>' + (file.type.startsWith('image/') ? '🖼' : '📄') + '</span><div style="flex:1"><div style="font-size:13px;font-weight:600;color:#0f172a">' + esc(file.name) + '</div><div id="prog-' + id + '" style="height:3px;background:#e2e8f0;border-radius:2px;margin-top:4px"><div id="bar-' + id + '" style="height:3px;background:#2563eb;border-radius:2px;width:0%;transition:width .3s"></div></div></div><button type="button" onclick="removeFile(\'' + id + '\')" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:18px">×</button>';
  document.getElementById('fileList').appendChild(item);

  var params = new URLSearchParams({ shop: SHOP, filename: file.name, mimeType: file.type || 'application/octet-stream', fileSize: String(file.size) });
  fetch(APP_URL + '/api/staged-upload?' + params)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.error) throw new Error(data.error);
      setBar(id, 40);
      var fd = new FormData();
      data.parameters.forEach(function(p) { fd.append(p.name, p.value); });
      fd.append('file', file);
      return fetch(data.url, { method: 'POST', body: fd }).then(function(r) {
        if (!r.ok) throw new Error('Upload failed');
        setBar(id, 100);
        document.getElementById('prog-' + id).style.display = 'none';
        var mark = document.createElement('span');
        mark.style.cssText = 'color:#10b981;font-weight:700';
        mark.textContent = '✓';
        document.getElementById('file-' + id).appendChild(mark);
        addHidden(id, data.resourceUrl, file.name, file.type);
      });
    })
    .catch(function(err) {
      var prog = document.getElementById('prog-' + id);
      if (prog) prog.innerHTML = '<div style="font-size:11px;color:#ef4444">' + esc(String(err.message)) + '</div>';
    });
}

function setBar(id, pct) {
  var bar = document.getElementById('bar-' + id);
  if (bar) bar.style.width = pct + '%';
}

function addHidden(id, url, name, mime) {
  var wrap = document.getElementById('hiddenInputs');
  ['attachmentUrl|' + url, 'attachmentName|' + name, 'attachmentMime|' + mime].forEach(function(pair) {
    var parts = pair.split('|');
    var inp = document.createElement('input');
    inp.type = 'hidden'; inp.name = parts[0]; inp.value = parts.slice(1).join('|');
    inp.dataset.fileId = id;
    wrap.appendChild(inp);
  });
}

function removeFile(id) {
  var el = document.getElementById('file-' + id);
  if (el) el.remove();
  document.querySelectorAll('[data-file-id="' + id + '"]').forEach(function(n) { n.remove(); });
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

var form = document.getElementById('complaintForm');
if (form) {
  form.addEventListener('submit', function() {
    var btn = document.getElementById('submitBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
  });
}
</script>
</body>
</html>`;
}

function tabLayout({ storeBase, activeTab, content }) {
  return `
    <div style="display:flex;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:6px;margin-bottom:20px;gap:6px;box-shadow:0 8px 32px rgba(0,0,0,0.1)">
      <a href="${storeBase}" style="flex:1;text-align:center;padding:11px 0;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;background:${activeTab === "submit" ? "linear-gradient(135deg,#1e3a5f,#2563eb)" : "transparent"};color:${activeTab === "submit" ? "#fff" : "#64748b"}">📝 Submit Issue</a>
      <a href="${storeBase}?mode=track" style="flex:1;text-align:center;padding:11px 0;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;background:${activeTab === "track" ? "linear-gradient(135deg,#1e3a5f,#2563eb)" : "transparent"};color:${activeTab === "track" ? "#fff" : "#64748b"}">🔍 Track My Case</a>
    </div>
    ${content}`;
}

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
