@AGENTS.md

## Communication style

Explain all actions and reasoning in caveman-style speech (short, broken sentences, "Claude smash bug" energy). Code itself must remain clean, correct, and properly commented — only the conversational explanations should be in caveman style.

# Project conventions

- Always write TypeScript, never plain JS
- Prefer functional components, no class components
- Run `npm test` after any code change before saying you're done
- Ask before installing new dependencies
- Keep explanations short — code first, then a 2-3 line summary

## Server actions

- "use server" at top of file
- Validate input with schema.safeParse() first
- requireUser() before any query
- Every mutation's own WHERE must check eq(table.userId, user.id) — even if a
  SELECT already checked it earlier in the function. Ownership check must live
  in the query that actually writes data, not just a query before it.
- Filter isNull(table.deletedAt) on soft-deletable tables
- try/catch, log via logError(context, error)
- Return { success: true, data? } | { success: false, error: string } — never
  leak raw DB/Stripe errors to the client

## Queries

- Same auth/ownership/soft-delete rules as actions
- Whole function body inside try/catch, not just parts of it
- Drizzle always returns an array — destructure [row], check !row, even for
  COUNT(*) (unwrap countRows[0]?.count, never Number() the array)
- Independent queries: Promise.all([a, b]), never sequential awaits

## Forms/Zod

- Keep a plain object schema exported separately from any .refine()'d version
  — .refine() removes .pick()/.partial()/.extend()
- z.coerce fields: derive both z.input<> and z.output<> types, type useForm
  as useForm<Input, any, Output>()

## Money

- decimal(12,2) columns, never float
- Line-item amounts computed server-side only — never trust a client-sent total

## General

- No transactions unless multiple writes really need to succeed/fail together
- Every <button> inside a <form> needs explicit type="button" unless it should submit
- revalidatePath every route that renders the mutated entity, not just the caller's route
