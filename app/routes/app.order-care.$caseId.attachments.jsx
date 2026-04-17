import { redirect } from "react-router";
import { unauthenticated } from "../shopify.server";
import { getComplaintByCaseId, addAttachment, deleteAttachment } from "../lib/order-care.server";

export async function action({ request, params }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  if (!shop) return redirect(`/app/order-care/${params.caseId}`);

  try { await unauthenticated.admin(shop); } catch (_) {
    return redirect(`/app/order-care/${params.caseId}?shop=${encodeURIComponent(shop)}`);
  }

  const formData = await request.formData();
  const intent = formData.get("intent");
  const qs = `?shop=${encodeURIComponent(shop)}`;

  if (intent === "delete") {
    const id = formData.get("id");
    try { await deleteAttachment({ id, shopDomain: shop }); } catch (_) {}
    return redirect(`/app/order-care/${params.caseId}${qs}`);
  }

  // intent === "add"
  const fileUrl = formData.get("fileUrl")?.trim();
  const fileName = formData.get("fileName")?.trim() || fileUrl?.split("/").pop() || "attachment";
  const mimeType = formData.get("mimeType")?.trim() || guessMime(fileName);

  if (!fileUrl) return redirect(`/app/order-care/${params.caseId}${qs}`);

  const complaint = await getComplaintByCaseId({ shopDomain: shop, caseId: params.caseId });
  if (!complaint) return redirect(`/app/order-care${qs}`);

  await addAttachment({ complaintId: complaint.id, fileName, url: fileUrl, mimeType });
  return redirect(`/app/order-care/${params.caseId}${qs}`);
}

function guessMime(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  const map = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
    webp: "image/webp", pdf: "application/pdf", doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain", mp4: "video/mp4", mov: "video/quicktime",
  };
  return map[ext] || null;
}
