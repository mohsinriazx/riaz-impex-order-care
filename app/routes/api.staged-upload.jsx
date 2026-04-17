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

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  const filename = url.searchParams.get("filename") || "upload";
  const mimeType = url.searchParams.get("mimeType") || "application/octet-stream";
  const fileSize = url.searchParams.get("fileSize") || "0";

  if (!shop) {
    return Response.json({ error: "Missing shop" }, { status: 400 });
  }

  let admin;
  try {
    ({ admin } = await unauthenticated.admin(shop));
  } catch (_) {
    return Response.json({ error: "Shop session not found" }, { status: 401 });
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
    return Response.json({ error: errors?.[0]?.message || "Staged upload failed" }, { status: 500 });
  }

  return Response.json({
    url: target.url,
    resourceUrl: target.resourceUrl,
    parameters: target.parameters,
  });
}
