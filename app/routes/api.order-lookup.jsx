import { unauthenticated } from "../shopify.server";

const ORDER_QUERY = `#graphql
  query orderLookup($query: String!) {
    orders(first: 1, query: $query) {
      nodes {
        id
        name
        customer {
          email
          displayName
        }
      }
    }
  }
`;

export async function loader({ request }) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "";
  const orderName = url.searchParams.get("orderName")?.trim() || "";

  if (!shop || !orderName) {
    return Response.json({ error: "Missing shop or orderName" }, { status: 400 });
  }

  let admin;
  try {
    ({ admin } = await unauthenticated.admin(shop));
  } catch (_) {
    return Response.json({ error: "Shop session not found" }, { status: 401 });
  }

  const query = orderName.startsWith("#") ? `name:${orderName}` : `name:#${orderName}`;

  const res = await admin.graphql(ORDER_QUERY, { variables: { query } });
  const json = await res.json();
  const order = json?.data?.orders?.nodes?.[0];

  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  return Response.json({
    orderId: order.id,
    orderName: order.name,
    customerEmail: order.customer?.email || "",
    customerName: order.customer?.displayName || "",
  });
}
