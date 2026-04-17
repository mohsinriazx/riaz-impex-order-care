async function send({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.RESEND_FROM || "Order Care <onboarding@resend.dev>";
  const reply_to = process.env.RESEND_REPLY_TO || "info@riazimpex.com";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, reply_to }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", err);
  }
}

export async function sendCustomerUpdate({ complaint }) {
  if (!complaint.customerEmail) return;
  await send({
    to: [complaint.customerEmail],
    subject: `Update on your case ${complaint.caseId} — Riaz Impex`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1e3a5f">Case Update — ${complaint.caseId}</h2>
        <p>Dear ${complaint.customerName || "Customer"},</p>
        <p>We have an update on your case <strong>${complaint.caseId}</strong>:</p>
        ${complaint.customerUpdate ? `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;white-space:pre-wrap;font-size:15px;color:#374151">${complaint.customerUpdate}</div>` : ""}
        <p><strong>Status:</strong> ${complaint.status}${complaint.resolutionType ? `<br><strong>Resolution:</strong> ${complaint.resolutionType}` : ""}</p>
        <p>You can track your case at: <a href="https://riazimpex.com/apps/order-care?mode=track">riazimpex.com/apps/order-care</a></p>
        <p style="color:#6b7280;font-size:13px">Thank you for your patience. — Riaz Impex Team</p>
      </div>`,
  });
}

export async function sendAdminNotification({ complaint }) {
  const adminEmail = process.env.RESEND_REPLY_TO || "info@riazimpex.com";
  await send({
    to: [adminEmail],
    subject: `New complaint received — ${complaint.caseId}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#1e3a5f">New Complaint Registered</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px">Case ID</td><td style="padding:8px 0;font-weight:700">${complaint.caseId}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Customer</td><td style="padding:8px 0">${complaint.customerName || "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email</td><td style="padding:8px 0">${complaint.customerEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Order</td><td style="padding:8px 0">${complaint.shopifyOrderName || "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Issue Type</td><td style="padding:8px 0">${complaint.issueType}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Product</td><td style="padding:8px 0">${complaint.productSummary || "—"}</td></tr>
        </table>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
          <div style="font-size:12px;color:#6b7280;margin-bottom:8px;font-weight:700;text-transform:uppercase">Message</div>
          <div style="white-space:pre-wrap;font-size:14px;color:#374151">${complaint.message}</div>
        </div>
        <p><a href="https://riaz-impex-order-care.onrender.com/app/order-care/${complaint.caseId}" style="background:#1e3a5f;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:700">View in Dashboard →</a></p>
      </div>`,
  });
}
