import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 5000;

function getCurrentShop(request) {
  const url = new URL(request.url);
  const candidates = [
    url.searchParams.get("shop"),
    request.headers.get("x-shopify-shop-domain"),
  ];

  for (const value of candidates) {
    if (!value) continue;
    const normalized = value.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(normalized)) {
      return normalized.toLowerCase();
    }
  }

  return null;
}

function withFrameAncestors(existingPolicy, ancestors) {
  const directives = existingPolicy
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean)
    .filter((directive) => !directive.toLowerCase().startsWith("frame-ancestors "));

  directives.push(`frame-ancestors ${ancestors.join(" ")}`);
  return directives.join("; ");
}

function applyEmbeddedAppHeaders(request, responseHeaders) {
  addDocumentResponseHeaders(request, responseHeaders);

  const ancestors = ["https://admin.shopify.com"];
  const shop = getCurrentShop(request);
  if (shop) ancestors.push(`https://${shop}`);

  const currentCsp = responseHeaders.get("Content-Security-Policy") || "";
  responseHeaders.set(
    "Content-Security-Policy",
    withFrameAncestors(currentCsp, ancestors),
  );
  responseHeaders.delete("X-Frame-Options");
}

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  reactRouterContext,
) {
  applyEmbeddedAppHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={reactRouterContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error(error);
        },
      },
    );

    // Automatically timeout the React renderer after 6 seconds, which ensures
    // React has enough time to flush down the rejected boundary contents
    setTimeout(abort, streamTimeout + 1000);
  });
}
