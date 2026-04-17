# RIAZ IMPEX Order Care — Shopify Admin App Scaffold

This is a starter scaffold for moving Order Care from Google Sheets into a more robust Shopify-admin workflow.

## What this scaffold is for
- Embedded Shopify admin app
- Central Order Care dashboard inside Shopify admin
- Order details admin block that shows complaint status on order pages
- Complaint storage model in a real database
- Sync points for storefront complaint submission and evidence files

## Recommended architecture
1. **Embedded app** inside Shopify admin for complaint operations.
2. **Admin block extension** on Shopify order pages for quick complaint visibility.
3. **Database storage** for complaint records and attachments.
4. **App proxy or storefront route** later for customer-facing complaint submission.
5. **Webhook sync** for orders and fulfillments if you want status syncing.

## Shopify capabilities this design uses
- Embedded apps in Shopify admin
- Admin UI extensions / admin blocks on resource pages
- App configuration via `shopify.app.toml`
- App proxy for storefront-side dynamic routes

These capabilities are documented by Shopify. See official docs:
- Embedded app / React Router app pattern
- Admin blocks and actions
- App proxies
- Admin UI extensions targets

## What is included
- `package.json`
- `shopify.app.toml.example`
- Prisma schema for complaints
- Admin dashboard route scaffold
- Order details admin block extension scaffold
- Utility code examples for querying/updating complaints

## What is NOT fully implemented
This is a starter scaffold, not a fully deployed production app.
You still need to:
- create the Shopify app in your Partner/Dev Dashboard
- configure auth/env vars
- choose a database
- implement complaint create/update endpoints
- connect evidence uploads to storage
- deploy the app

## Suggested next build order
1. Get embedded app running locally with Shopify CLI
2. Add database and complaint CRUD
3. Add order admin block
4. Add status update + email notifications
5. Migrate storefront form from Apps Script to app proxy
6. Move attachments to S3 / Cloudflare R2 / Supabase Storage

## Local setup summary
1. Install Shopify CLI
2. Create app credentials in Shopify
3. Copy `shopify.app.toml.example` to `shopify.app.toml`
4. Fill `.env`
5. Install dependencies
6. Run migrations
7. Run `shopify app dev`

## Notes
For your store specifically, I recommend starting as a **private custom app** for RIAZ IMPEX only.