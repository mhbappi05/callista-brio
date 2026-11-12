# Callista Brio

Single-brand e-commerce store for handcrafted jewelry (Bangladesh, BDT).
Stack: React + Vite, Tailwind CSS, Framer Motion, Lucide, Supabase.

## Getting started
```bash
npm install
cp .env.example .env   # add your Supabase URL and anon key
npm run dev
npm test
```

## Structure
See section 12 of the technical documentation. Business logic stays out of page
components; trusted operations (totals, stock, payments) run in `supabase/functions`.

## Roadmap
- [x] Phase 1: Foundation (root scaffold, tokens, routing, layout shell)
- [ ] Phase 2: Storefront
- [x] Phase 3: Backend foundation (schema, RLS, storage, order functions; see supabase/README.md)
