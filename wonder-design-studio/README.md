# Wonder Design Studio — MVP

Interactive 3D configurator for Wonder's customizable indoor wooden playground
equipment. Arabic-first (RTL) with optional English. Runs entirely in the
browser; no backend.

> **Status: sales-visualisation prototype.** Every dimension range, section
> size, clearance allowance and price in this code base is a **placeholder**.
> Nothing here is structurally validated, safety-assessed or a verified cost.

## Run it

All commands run on your **local Mac / Windows workstation**, inside this folder
(`wonder-design-studio/`). Requires Node.js 20+.

```bash
npm install        # once
npm run dev        # development server -> http://localhost:5173
npm test           # domain unit tests (geometry, pricing, validation)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build -> http://localhost:4173
```

To test on an iPhone / iPad on the same Wi-Fi: `npm run dev` prints a
`Network:` URL (e.g. `http://192.168.x.x:5173`) — open it in Safari.

`dist/` is a static site (relative paths) and can be hosted on any static host.

## What is in the MVP

| Section | What it does |
|---|---|
| Dashboard | Quick actions, counts, design-stage definitions, standards checklist for engineering review |
| Product Library | Jungle Gym product card, modular component library |
| 3D Studio | Orbit / pan / zoom, view presets, dimension indicators, grid, room outline, width / depth / height, activity toggles, visibility toggles, wood / finish / rope colours, live validation warnings |
| Cost Estimator | Editable SAR pricing, cost breakdown by category, production cost, selling price, gross margin, preliminary BOM |
| Customer Projects | Customer + reference + room dimensions, saved designs, reopen & edit, design-stage record, preliminary quotation (PDF download or print) |

## Architecture

```
src/
  domain/            Pure TypeScript. No React, no three.js.
    types.ts         Part, ProductDefinition, Project, DesignStage …
    components.ts    Modular component library (post, beam, rung, rope, connector)
    products/        Product registry + parametric Jungle Gym builder
    pricing.ts       Quantities, BOM, cost model (editable settings)
    validation.ts    Range / room-clearance / approval warnings, stage labels
    standards.ts     Checklist of standards for the engineering review
    materials.ts     Wood, finish and rope options
  data/repository.ts ProjectRepository interface + localStorage implementation
  store/useStore.ts  Zustand store (UI state, draft design, projects, pricing)
  viewer/Viewer3D.tsx Generic renderer: draws any Part[] (React Three Fiber)
  pages/             Dashboard, Library, Configurator, CostEstimator, Projects, Quotation
  ui/                Shared UI + translation helper
```

**Coordinate system:** X = width, Y = height (up), Z = depth; origin at floor
level in the centre of the footprint. Domain values are centimetres; the viewer
converts to metres.

**Single source of truth:** `product.build(config)` returns a flat `Part[]`.
The 3D viewer, the quantities, the BOM and the cost are all derived from that
same list, so the picture and the numbers cannot drift apart.

### Extending

- **New product family:** add a `ProductDefinition` in `src/domain/products/`
  and register it in `products/index.ts`. The viewer, costing and projects
  pick it up without changes.
- **New activity:** add an `ActivityDef` and emit its parts (with its own
  `group` id) from the product's `build()`.
- **Database / multi-device sync:** implement `ProjectRepository`
  (`src/data/repository.ts`) against an API and swap the exported instance.
- **Room photos, AI visualisation, AR, drawings:** `Project.attachments` is a
  reserved extension point; cut lists can be generated from `Part[]`.

## Design-stage rules (safety)

1. Visual concept → 2. Preliminary design → 3. Engineering-approved → 4. Production-ready

- A new design always starts at *Visual concept*.
- The software never promotes a design past *Preliminary design* by itself.
- *Engineering-approved* is a manual record (engineer name + document
  reference + acknowledgement). The software stores the decision; it does not
  verify it.
- Changing and saving an approved design revokes the recorded approval.
- The 3D model is not evidence of load capacity, anchoring suitability or
  standards compliance.

## Known limitations

- Data lives in the browser's localStorage on one device; clearing site data
  deletes it. No login, no sync, no backup.
- PDF export is a rasterised image of the quotation (keeps Arabic shaping
  correct); text in the PDF is not selectable. "Print → Save as PDF" gives a
  text PDF.
- Prices, densities, sections, clearance allowances and dimension ranges are
  placeholders pending supplier data and engineering review.
- The standards list is an unverified starting checklist.
