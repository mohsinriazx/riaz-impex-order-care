import { getComplaintByCaseId, updateComplaint } from "../lib/order-care.server.js";
import { authenticate } from "../shopify.server";

export async function loader({request, params}) {
  const { session } = await authenticate.admin(request);
  const complaint = await getComplaintByCaseId({shopDomain: session.shop, caseId: params.caseId});
  if (!complaint) {
    return Response.json({error: "Complaint not found"}, {status: 404});
  }
  return {complaint};
}

export async function action({request, params}) {
  const { session } = await authenticate.admin(request);
  const body = await request.json();

  const updated = await updateComplaint({
    shopDomain: session.shop,
    caseId: params.caseId,
    status: body.status,
    resolutionType: body.resolutionType,
    customerUpdate: body.customerUpdate,
    internalNotes: body.internalNotes,
    priority: body.priority
  });

  return {ok: true, complaint: updated};
}
