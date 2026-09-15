# Table Row Actions — Implementation Guide

This document explains how row actions (Edit, View, Delete) work in Clentric data tables, how they were built, and how to add them to new entities in a **production-ready** way.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Was Built](#how-it-was-built)
4. [How to Add Actions for a New Entity](#how-to-add-actions-for-a-new-entity)
5. [Production-Ready Checklist](#production-ready-checklist)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

---

## Overview

List pages (Clients, Projects) show three icon buttons per row:

| Icon | Action | Result |
|------|--------|--------|
| **Pencil** | Edit | Navigate to detail page with `?edit=true` (opens in edit mode) |
| **Arrow (external link)** | View details | Navigate to detail page |
| **Trash** | Delete | Confirmation dialog → server action → toast → list refresh |

The same actions appear in:
- Desktop table **Actions** column
- Mobile card layouts

---

## Architecture

Three layers — keep them separate:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Generic UI (shared)                               │
│  components/data-table/table-row-actions.tsx                │
│  - Icons, navigation, delete dialog, toasts                 │
│  - Knows NOTHING about clients, projects, invoices          │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ onDelete, detailHref, copy
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Domain wrapper (one per entity)                   │
│  app/(dashboard)/clients/client-row-actions.tsx             │
│  app/(dashboard)/projects/project-row-actions.tsx           │
│  - Wires the correct server action + user-facing messages     │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ used in cell / mobile card
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Column / mobile definitions                       │
│  client-columns.tsx, projects-columns.tsx, mobile cards     │
│  - One line: <ClientRowActions client={row} />              │
└─────────────────────────────────────────────────────────────┘
```

**Why three layers?**

- **Layer 1** stays generic — no imports from `clients/actions` or `projects/actions`.
- **Layer 2** keeps domain logic (which delete action, which messages) next to the feature.
- **Layer 3** stays declarative and easy to read.

This is the production-ready pattern: **generic component + thin domain wrapper**.

---

## How It Was Built

### Step 1 — Generic `TableRowActions` component

**File:** `components/data-table/table-row-actions.tsx`

Responsibilities:
- Render Edit / View / Delete icon buttons
- **`stopPropagation()`** on every click so row-level `onRowClick` does not fire
- Navigate with `useRouter().push()`
- Show `DeleteDialog` before deleting
- Call `onDelete()` prop (returns `{ success, error? }`)
- Show loading/success/error toasts
- **`router.refresh()`** after successful delete
- **Re-throw on delete failure** so the dialog stays open

It does **not** import any feature-specific server actions.

### Step 2 — Domain wrappers

**Clients:** `app/(dashboard)/clients/client-row-actions.tsx`

```tsx
"use client";

import { deleteClientAction } from "./actions";
import { TableRowActions } from "@/components/data-table/table-row-actions";

export function ClientRowActions({ client }) {
  return (
    <TableRowActions
      entityName={client.name}
      detailHref={`/clients/${client.id}`}
      onDelete={() => deleteClientAction(client.id)}
      deleteLoadingMessage="Deleting client..."
      deleteSuccessMessage="Client deleted."
      deleteTitle="Delete client"
    />
  );
}
```

**Projects:** `app/(dashboard)/projects/project-row-actions.tsx` — same pattern with `deleteProjectAction`.

### Step 3 — Use in column definitions

**File:** `app/(dashboard)/clients/client-columns.tsx`

```tsx
{
  header: "Actions",
  className: "text-right",
  cell: (row) => <ClientRowActions client={row} />,
}
```

**File:** `app/(dashboard)/projects/projects-columns.tsx`

```tsx
{
  header: "Actions",
  className: "text-right",
  cell: (row) => <ProjectRowActions project={row} />,
}
```

### Step 4 — Use in mobile cards

**Clients:** `components/data-table/data-table-mobile.tsx`  
**Projects:** `app/(dashboard)/projects/render-client-mobile-card.tsx`

Same wrapper component — actions stay consistent across breakpoints.

### Step 5 — Edit mode on detail pages

Edit navigates to `/entity/[id]?edit=true`. The detail page must support that.

**Server page** reads `searchParams` and passes `initialEdit`:

```tsx
// app/(dashboard)/projects/[id]/page.tsx
export default async function ProjectPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <ProjectDetail
      project={project}
      initialEdit={query.edit === "true"}
    />
  );
}
```

**Client detail component** uses `initialEdit`:

```tsx
export function ProjectDetail({ project, initialEdit = false }) {
  const [isEditing, setIsEditing] = useState(initialEdit);

  useEffect(() => {
    if (!initialEdit) return;
    reset(toProjectFormDefaults(project));
    setIsEditing(true);
  }, [initialEdit, project, reset]);

  // PageHeader actions switch between Edit/Delete and Cancel/Save
}
```

On Cancel/Save, clear the query param with `router.replace(\`/projects/${id}\`)`.

### Step 6 — Row click vs action clicks

Tables also have `onRowClick` on the full row (navigate to details). Action buttons call `event.stopPropagation()` so clicking an icon does not also trigger the row click.

---

## How to Add Actions for a New Entity

Example: **Invoices**

### 1. Create the server delete action

**File:** `app/(dashboard)/invoices/actions.ts`

```tsx
"use server";

export async function deleteInvoiceAction(invoiceId: string): Promise<ActionResult> {
  const user = await requireUser();
  // ... validate, scope by userId, soft delete
  revalidatePath("/invoices");
  return { success: true };
}
```

Requirements:
- Validate ID with Zod
- Scope by `userId` via `requireUser()`
- Return `{ success: true }` or `{ success: false, error: "..." }`
- Call `revalidatePath` for affected routes

### 2. Create a domain wrapper

**File:** `app/(dashboard)/invoices/invoice-row-actions.tsx`

```tsx
"use client";

import { deleteInvoiceAction } from "./actions";
import { TableRowActions } from "@/components/data-table/table-row-actions";

type InvoiceRowActionsProps = {
  invoice: { id: string; invoiceNumber: string };
  className?: string;
};

export function InvoiceRowActions({ invoice, className }: InvoiceRowActionsProps) {
  return (
    <TableRowActions
      entityName={invoice.invoiceNumber}
      detailHref={`/invoices/${invoice.id}`}
      onDelete={() => deleteInvoiceAction(invoice.id)}
      deleteLoadingMessage="Deleting invoice..."
      deleteSuccessMessage="Invoice deleted."
      deleteTitle="Delete invoice"
      deleteDescription={`Delete invoice ${invoice.invoiceNumber}? This can't be undone.`}
      className={className}
    />
  );
}
```

### 3. Add Actions column

**File:** `app/(dashboard)/invoices/invoice-columns.tsx`

```tsx
{
  header: "Actions",
  className: "text-right",
  cell: (row) => <InvoiceRowActions invoice={row} />,
}
```

### 4. Build the detail page with `initialEdit`

```tsx
// app/(dashboard)/invoices/[id]/page.tsx
return (
  <InvoiceDetail
    invoice={invoice}
    initialEdit={query.edit === "true"}
  />
);
```

Detail component: same pattern as `ProjectDetail` / `ClientDetail`.

### 5. Add to mobile card (if applicable)

```tsx
<InvoiceRowActions invoice={row} />
```

### 6. Verify end-to-end

- [ ] Edit icon → detail page opens in edit mode, Cancel/Save in header work
- [ ] View icon → detail page opens in view mode
- [ ] Delete icon → dialog → confirm → toast → row removed from list
- [ ] Clicking icons does not double-trigger row navigation
- [ ] Delete failure keeps dialog open and shows error toast
- [ ] User can only delete their own records (server action scoped by `userId`)

---

## Production-Ready Checklist

Use this before shipping row actions for any entity.

### Security

- [ ] Delete action validates ID (Zod)
- [ ] Delete action scopes query by authenticated `userId`
- [ ] No delete by ID alone without ownership check
- [ ] Soft delete preferred over hard delete where applicable

### UX

- [ ] Every button has an `aria-label` (handled by `TableRowActions`)
- [ ] Delete requires confirmation dialog
- [ ] Loading state during delete (toast + disabled trash icon)
- [ ] Success toast after delete
- [ ] Error toast on failure; dialog stays open
- [ ] List refreshes after delete (`router.refresh()`)
- [ ] Edit opens detail in edit mode; Cancel clears `?edit=true`

### Code structure

- [ ] Generic `TableRowActions` — no feature imports
- [ ] Thin `{Entity}RowActions` wrapper per domain
- [ ] Column file only imports the wrapper
- [ ] Same wrapper used in desktop + mobile layouts

### Optional customisation

| Prop | When to use |
|------|-------------|
| `showEdit={false}` | Entity has no inline edit on detail page |
| `showView={false}` | Row click already navigates; hide duplicate |
| `showDelete={false}` | Read-only entity |
| `editHref` | Custom edit route (not `?edit=true`) |
| `deleteDescription` | Entity-specific warning text |

---

## API Reference

### `TableRowActions`

**File:** `components/data-table/table-row-actions.tsx`

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `entityName` | `string` | Yes | — | Name shown in labels and delete dialog |
| `detailHref` | `string` | Yes | — | Detail page URL |
| `onDelete` | `() => Promise<ActionResult>` | Yes | — | Server action for delete |
| `deleteLoadingMessage` | `string` | No | `"Deleting..."` | Toast while deleting |
| `deleteSuccessMessage` | `string` | No | `"Deleted."` | Toast on success |
| `deleteTitle` | `string` | No | `"Delete record"` | Dialog title |
| `deleteDescription` | `string` | No | Auto from `entityName` | Dialog body |
| `editHref` | `string` | No | `` `${detailHref}?edit=true` `` | Edit navigation target |
| `showEdit` | `boolean` | No | `true` | Show pencil icon |
| `showView` | `boolean` | No | `true` | Show view icon |
| `showDelete` | `boolean` | No | `true` | Show trash icon |
| `className` | `string` | No | — | Wrapper div classes |

### `ActionResult`

```tsx
type ActionResult = { success: true } | { success: false; error: string };
```

Must match the pattern used by all server actions in this project.

---

## Troubleshooting

### Clicking an icon also navigates (row click fires)

Ensure `TableRowActions` wraps buttons with `stopPropagation`. Do not remove the wrapper `onClick={stopPropagation}` on the actions container.

### Edit opens detail but not in edit mode

1. Check URL has `?edit=true`
2. Check server page passes `initialEdit={query.edit === "true"}`
3. Check detail component uses `useState(initialEdit)` and resets form in `useEffect`

### Delete succeeds but list still shows the row

Ensure `router.refresh()` runs after success (built into `TableRowActions`). Also ensure the delete action calls `revalidatePath("/your-list-route")`.

### Delete dialog closes even on error

`handleDelete` re-throws after showing an error toast so `DeleteDialog` stays open. Do not swallow errors in `onDelete`.

### `"use client"` errors in column files

Column files can stay as plain modules. Only the wrapper (`ClientRowActions`) and `TableRowActions` need `"use client"`.

---

## File Map (current implementation)

| File | Purpose |
|------|---------|
| `components/data-table/table-row-actions.tsx` | Generic action UI |
| `app/(dashboard)/clients/client-row-actions.tsx` | Client-specific wiring |
| `app/(dashboard)/projects/project-row-actions.tsx` | Project-specific wiring |
| `app/(dashboard)/clients/client-columns.tsx` | Clients table Actions column |
| `app/(dashboard)/projects/projects-columns.tsx` | Projects table Actions column |
| `components/data-table/data-table-mobile.tsx` | Client mobile actions |
| `app/(dashboard)/projects/render-client-mobile-card.tsx` | Project mobile actions |
| `app/(dashboard)/clients/[id]/page.tsx` | Passes `initialEdit` to detail |
| `app/(dashboard)/projects/[id]/page.tsx` | Passes `initialEdit` to detail |
| `app/(dashboard)/clients/[id]/client-details.tsx` | Edit mode + header actions |
| `app/(dashboard)/projects/project-details.tsx` | Edit mode + header actions |

---

## Quick Copy-Paste Template

```tsx
// app/(dashboard)/{entity}/{entity}-row-actions.tsx
"use client";

import { deleteEntityAction } from "./actions";
import { TableRowActions } from "@/components/data-table/table-row-actions";

export function EntityRowActions({
  entity,
}: {
  entity: { id: string; name: string };
}) {
  return (
    <TableRowActions
      entityName={entity.name}
      detailHref={`/{entities}/${entity.id}`}
      onDelete={() => deleteEntityAction(entity.id)}
      deleteLoadingMessage="Deleting..."
      deleteSuccessMessage="Deleted."
      deleteTitle="Delete {entity}"
    />
  );
}
```

Replace `{entity}`, `{entities}`, and field names to match your domain.

---

*Last updated: August 2026*
