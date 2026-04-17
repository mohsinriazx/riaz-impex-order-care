import {
  extension,
  AdminBlock,
  Badge,
  BlockStack,
  Link,
  Text,
} from "@shopify/ui-extensions/admin";

export default extension("admin.order-details.block.render", (root) => {
  const mockComplaint = {
    caseId: "RIX-1042",
    status: "Under Review",
    note: "Customer reported missing accessory. Team reviewing attached evidence.",
    attachments: 2,
    dashboardUrl: "app:/order-care",
  };

  const content = root.createComponent(BlockStack, { gap: true }, [
    root.createComponent(Text, { fontWeight: "bold" }, "Complaint status"),
    root.createComponent(Badge, {}, mockComplaint.status),
    root.createComponent(Text, {}, mockComplaint.note),
    root.createComponent(Text, {}, `Case ID: ${mockComplaint.caseId}`),
    root.createComponent(Text, {}, `Attachments: ${String(mockComplaint.attachments)}`),
    root.createComponent(Link, { href: mockComplaint.dashboardUrl }, "Open Order Care dashboard"),
  ]);

  const adminBlock = root.createComponent(AdminBlock, { title: "Order Care" }, [content]);

  root.appendChild(adminBlock);
  root.mount();
});
