# PartFit Ghana

Mobile-first installable auto-parts catalogue for Ghana with vehicle fitment guidance, product details, WhatsApp ordering and Spintex pickup.

## Live site

GitHub Pages publishes from `main` at the PartFit-GH project URL.

## Customer flow

1. Select vehicle make, model, year and engine.
2. Browse/search parts and review fitment status.
3. Open product details, stock, reference and data source.
4. Add items to the order or use **Request a Part** when the exact SKU is not listed.
5. Send the order/request to WhatsApp for human fitment and availability confirmation.

## Fitment safety

PartFit distinguishes between manufacturer-supported application matches, potential matches requiring OE/VIN confirmation, and products where no fitment claim is made. See `FITMENT_DATA.md`.

## Configuration

Business WhatsApp number, pickup location and hours live in `data.js` under `CFG`. Replace the placeholder number and location details before launch.

## Product images

The current demo uses category-accurate reference images. Each reference image is disclosed in the UI. Replace every sellable SKU with an exact supplier/manufacturer product photograph before commercial launch.

## PWA

The site includes a manifest and service worker so it can be installed from a supported mobile browser and used as a standalone web app.
