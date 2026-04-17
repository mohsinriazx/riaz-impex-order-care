export async function sendCustomerUpdate({ complaint }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.RESEND_FROM || "Order Care <onboarding@resend.dev>";
  const subject = `Update on your case ${complaint.caseId}`;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#111827">Case Update — ${complaint.caseId}</h2>
      <p>Dear ${complaint.customerName || "Customer"},</p>
      <p>We have an update on your case <strong>${complaint.caseId}</strong>:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;white-space:pre-wrap;font-size:15px;color:#374151">${complaint.customerUpdate}</div>
      <p><strong>Status:</strong> ${complaint.status}${complaint.resolutionType ? `<br><strong>Resolution:</strong> ${complaint.resolutionType}` : ""}</p>
      <p style="color:#6b7280;font-size:13px">Thank you for your patience.</p>
    </div>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [complaint.customerEmail], subject, html, reply_to: process.env.RESEND_REPLY_TO || "info@riazimpex.com" }),
  });
}
