# Blaqdawg Vintage Store

React + Vite + JavaScript + Tailwind CSS + Supabase.

## 1. Install and run
```bash
npm install
cp .env.example .env
npm run dev
```
Add your Supabase Project URL and anon/public key to `.env`.

## 2. Set up Supabase
1. Open your Supabase project → SQL Editor.
2. Run `supabase/schema.sql`.
3. In Authentication → Users, create your admin user (email + password).
4. Copy that user's UUID, then run the admin INSERT statement at the bottom of `supabase/schema.sql`, replacing `YOUR_AUTH_USER_UUID`.
5. In Storage, the SQL setup creates a public `product-images` bucket and policies. If bucket creation is unavailable in SQL, create a public bucket named `product-images` manually.

## 3. Admin
Open `/admin`, sign in using the admin account. Add products, upload images, set prices, descriptions, stock, and mark products as specials. New active products automatically appear in Recently Added.

## 4. Checkout
Checkout adds the fixed R150 delivery fee and opens WhatsApp with the customer's order, item details, delivery, total and lead-time note. The customer confirms payment with the store; the 2–3 week lead time starts after payment is confirmed.

## 5. Deploy
Build with `npm run build`; deploy the `dist` folder to your preferred static host. Set the same environment variables in the hosting dashboard. Add your deployed domain to Supabase Authentication → URL Configuration if needed.

## Notes
- Public visitors can only read active products.
- Only users listed in `public.admin_users` can manage inventory.
- Never put the Supabase `service_role` key in frontend code.
- Configure Supabase Auth email/password and secure your admin password.
