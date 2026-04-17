import { unauthenticated } from "../shopify.server";

const STAGED_UPLOADS_MUTATION = `#graphql
  mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters { name value }
      }
      userErrors { field message }
    }
  }
`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function loader({ request }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  const filename = url.searchParams.get("filename") || "upload";
  const mimeType = url.searchParams.get("mimeType") || "application/octet-stream";
  const fileSize = url.searchParams.get("fileSize") || "0";

  if (!shop) {
    return Response.json({ error: "Missing shop" }, { status: 400, headers: CORS });
  }

  // Try proxy shop first; fall back to the primary installed shop
  const fallbackShop = process.env.SHOPIFY_STORE_DOMAIN || shop;
  let admin;
  try {
    ({ admin } = await unauthenticated.admin(shop));
  } catch (_) {
    try {
      ({ admin } = await unauthenticated.admin(fallbackShop));
    } catch (__) {
      return Response.json({ error: "Shop session not found. Please contact support." }, { status: 401, headers: CORS });
    }
  }

  const res = await admin.graphql(STAGED_UPLOADS_MUTATION, {
    variables: {
      input: [{
        filename,
        mimeType,
        resource: "FILE",
        fileSize: String(fileSize),
        httpMethod: "POST",
      }],
    },
  });

  const json = await res.json();
  const target = json?.data?.stagedUploadsCreate?.stagedTargets?.[0];
  const errors = json?.data?.stagedUploadsCreate?.userErrors;

  if (!target || errors?.length) {
    return Response.json({ error: errors?.[0]?.message || "Staged upload failed" }, { status: 500, headers: CORS });
  }

  return Response.json({
    url: target.url,
    resourceUrl: target.resourceUrl,
    parameters: target.parameters,
  }, { headers: CORS });
}
