# SolarTech Inventory

Internal merchandise catalog and stock tracker.

- `index.html` &mdash; no login. Staff can see current stock and submit a request for an item.
- `admin.html` &mdash; login required. Edit stock quantities, add/remove items, and approve or reject requests.

No build step: plain HTML/CSS/JS, with [Supabase](https://supabase.com) for the database, auth, and stock-management logic.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account/project.
2. In the project, open **SQL Editor -> New query**, paste in the contents of [supabase-schema.sql](supabase-schema.sql), and run it. This creates the `items` and `requests` tables, the security rules, and three example items.
3. Go to **Project Settings -> API** and copy the **Project URL** and the **anon public** key.
4. Open [config.js](config.js) and paste those two values in place of `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY`.

## 2. Create your admin login

1. In Supabase, go to **Authentication -> Users -> Add user**.
2. Create a user with your email and a password. This is the only account that can sign in to `admin.html`.
3. Do **not** enable public sign-ups &mdash; the schema is set up so the single account(s) you create here are the only admins. Staff never need an account; they use `index.html` directly.

## 3. Run it locally

Any static file server works, e.g.:

```
npx serve .
```

Then open `http://localhost:3000` for the catalog and `/admin.html` for the admin view.

## 4. Deploy

1. Push this folder to its own GitHub repo.
2. Import it into [Vercel](https://vercel.com) as a new project (framework preset: "Other" / static).
3. In Vercel, add a custom domain, e.g. a subdomain like `stock.solartechonline.com` or `inventory-sx7k2.solartechonline.com` if you'd rather it not be guessable. Vercel will give you a DNS record (usually a `CNAME`) to add at your domain registrar.
4. This project is intentionally not linked from the main solartechonline.com site or its nav &mdash; only people with the direct subdomain URL will find it.

## How the request workflow works

- A staff member opens the catalog, clicks **Request** on an item, enters their name, quantity, and an optional note. This is saved as a `pending` row in `requests` &mdash; no login needed to submit.
- You open `admin.html`, sign in, and see all pending requests under **Pending requests**.
- Clicking **Fulfill** atomically decrements that item's stock by the requested quantity and marks the request fulfilled. Clicking **Reject** just marks it rejected without touching stock.
- Editing the **Quantity** field under **Items & stock** and clicking **Save** lets you correct stock directly (e.g. after a physical count or a restock), independent of the request queue.

## Notes on security

- The anon key in `config.js` is meant to be public-facing; it's not a secret. Access control comes from the Row Level Security policies in `supabase-schema.sql`: anyone can read items and submit a request, but only a signed-in user can edit stock, add/delete items, or manage requests.
- Because the catalog page requires no login, treat the subdomain itself as the access control &mdash; don't link it from public pages or share the URL outside your team.
