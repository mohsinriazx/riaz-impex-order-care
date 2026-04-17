# Suggested production architecture for RIAZ IMPEX Order Care

## Storefront side
- Current theme page stays temporarily
- Later move complaint submission to:
  - app proxy endpoint, or
  - customer account extension if needed

## Shopify admin side
- Embedded app route: `/app/order-care`
- Admin block extension on order detail pages
- Optional admin action extension: "Open Order Care"

## Data model
Store complaints in DB first.
Optionally mirror a few fields into Shopify metafields/metaobjects later.

## Why DB first instead of metaobjects first
Metaobjects are valid and Shopify supports them, but a DB is easier for:
- filtering
- search
- attachments
- audit logs
- internal notes
- role-based access later

## Good later additions
- webhook sync for fulfillments/orders
- auto-email on status update
- priority and SLA timers
- canned response templates
- CSV export