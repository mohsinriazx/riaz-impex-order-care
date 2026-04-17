import prisma from "../db.server.js";

function generateCaseId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `OC-${ts}-${rand}`;
}

export async function listComplaints({ shopDomain, status, query }) {
  return prisma.complaint.findMany({
    where: {
      shopDomain,
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { caseId: { contains: query } },
              { shopifyOrderName: { contains: query } },
              { customerEmail: { contains: query } },
              { customerName: { contains: query } },
              { productSummary: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { attachments: true },
    take: 100,
  });
}

export async function getComplaintByCaseId({ shopDomain, caseId }) {
  return prisma.complaint.findFirst({
    where: { shopDomain, caseId },
    include: { attachments: true },
  });
}

export async function createComplaint({
  shopDomain,
  shopifyOrderId,
  shopifyOrderName,
  customerEmail,
  customerName,
  issueType,
  productSummary,
  trackingNumber,
  carrier,
  message,
  priority = "Normal",
  source = "admin",
}) {
  const caseId = generateCaseId();
  return prisma.complaint.create({
    data: {
      caseId,
      shopDomain,
      shopifyOrderId: shopifyOrderId || null,
      shopifyOrderName: shopifyOrderName || null,
      customerEmail,
      customerName: customerName || null,
      issueType,
      productSummary: productSummary || null,
      trackingNumber: trackingNumber || null,
      carrier: carrier || null,
      message,
      priority,
      source,
    },
  });
}

export async function addAttachment({ complaintId, fileName, url, mimeType }) {
  return prisma.attachment.create({
    data: { complaintId, fileName, url, mimeType: mimeType || null },
  });
}

export async function deleteAttachment({ id, shopDomain }) {
  // Verify the attachment belongs to this shop before deleting
  const att = await prisma.attachment.findFirst({
    where: { id, complaint: { shopDomain } },
  });
  if (!att) throw new Error("Attachment not found");
  return prisma.attachment.delete({ where: { id } });
}

export async function updateComplaint({
  shopDomain,
  caseId,
  status,
  resolutionType,
  customerUpdate,
  internalNotes,
  priority,
}) {
  // updateMany supports compound where without unique constraint — ensures shop isolation
  return prisma.complaint.updateMany({
    where: { caseId, shopDomain },
    data: {
      ...(status ? { status } : {}),
      ...(resolutionType !== undefined ? { resolutionType: resolutionType || null } : {}),
      ...(customerUpdate !== undefined ? { customerUpdate: customerUpdate || null } : {}),
      ...(internalNotes !== undefined ? { internalNotes: internalNotes || null } : {}),
      ...(priority ? { priority } : {}),
    },
  });
}
