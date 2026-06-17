# GoalCryst CRM: TCL Edition

GoalCryst CRM (TCL) is a Next.js 15 standalone application integrated with a self-hosted Supabase Docker container database. It features client-side batched imports, a Customer 360 view, and real-time dashboard analytics.

---

## 1. Local Development Setup

### A. Environment Configuration
Create a `.env` or `.env.local` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
```

### B. Install & Run
```bash
# Install dependencies
npm install

# Start local server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the development app.

---

## 2. Production Deployment (Host: 49.249.53.189)

The production architecture separates public browser requests from low-latency internal container communications (avoiding NAT loopback issues).

### A. Production Environment Variables
*   **Build Time (`.env.production`)**: Baked into client assets.
    ```env
    NEXT_PUBLIC_SUPABASE_URL=https://api.goalcryst.co.in
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
    ```
*   **Run Time (`.env.docker`)**: Injected into the container environment.
    ```env
    SUPABASE_INTERNAL_URL=http://supabase-kong:8000
    SUPABASE_SERVICE_ROLE_KEY=your_secret_service_role_key
    ```

### B. Build and Deploy Container
Execute the following commands on the server:
```bash
# 1. Build Docker image with client variables
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://api.goalcryst.co.in \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key \
  -t goalcryst-crm-tcl:latest .

# 2. Run the container on the Supabase network
docker run -d \
  --name goalcryst-crm-tcl \
  --restart unless-stopped \
  --network supabase_default \
  -p 3000:3000 \
  --env-file .env.docker \
  goalcryst-crm-tcl:latest
```

---

## 3. Production Domains & Nginx Configuration

*   **Application Frontend URL**: `https://crm.goalcryst.co.in`
*   **Supabase Public API URL**: `https://api.goalcryst.co.in`

Make sure Nginx maps your public server port `3000` to `crm.goalcryst.co.in` and proxies `api.goalcryst.co.in` directly to Kong.
