# PartFit Ghana — Inventory & Fitment Data Rules

PartFit should never claim that a part **fits** a vehicle solely because the make/model looks compatible.

## Fitment states

- `catalog`: supported by a manufacturer or authoritative catalogue application. Exact engine/variant must still be respected.
- `confirm`: potential application family only. Confirm OE number, VIN, dimensions or installed-part reference before fulfilment.
- `none`: no fitment claim. The item may still be ordered after manual verification.

## Required inventory fields

Every sellable SKU should eventually have an internal SKU, brand, exact manufacturer part number, OE/OEM cross-reference, category, position where relevant, make/model/year/engine application, GHS price, stock, exact product photo, catalogue evidence and fitment status.

## Image rule

A category/reference photo may be used during catalogue development only if the UI labels it **Reference photo**. Before commercial launch, replace it with a photograph of the exact SKU being sold.

## Supplier workflow

1. Get the supplier catalogue, price list and product photographs.
2. Add one fitment/application row per vehicle variant.
3. Record OE and aftermarket cross-reference numbers exactly as supplied.
4. Mark an image as exact only when it shows the exact sellable SKU/reference.
5. Use `catalog` only where authoritative catalogue evidence supports the application.
6. Spot-check safety-critical items before publishing.
