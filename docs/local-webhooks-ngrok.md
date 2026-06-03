# Local Mercado Pago Webhooks with ngrok

Use ngrok only for local development when testing Mercado Pago callbacks.

1. Start the app:

```bash
npm run dev
```

2. Expose the local app:

```bash
npm run dev:ngrok
```

3. Copy the HTTPS forwarding URL into `.env.local`:

```bash
NGROK_PUBLIC_URL=https://your-ngrok-url.ngrok-free.app
```

4. Restart Next.js so checkout preferences use:

```text
https://your-ngrok-url.ngrok-free.app/api/mercado-pago/webhook
```

`POST /api/bookings` uses `NGROK_PUBLIC_URL` for the Mercado Pago `notification_url` when it is configured, and falls back to `NEXT_PUBLIC_APP_URL` otherwise.
