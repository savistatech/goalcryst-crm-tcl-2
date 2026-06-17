# Goalcryst CRM: Production Architecture & DevOps Manual

This document outlines the production architecture, network topology, routing configuration, and container layout for the Goalcryst CRM systems. It serves as the primary technical reference for DevOps engineers and system administrators.

---

## 1. System Topology Overview

Goalcryst CRM runs as a **dual-instance, multi-tenant** application deployment on a single physical host. Each instance (TCL and TMF) is completely isolated with its own frontend container and its own dedicated self-hosted Supabase database stack.

```mermaid
graph TD
    Client[Browser / Client] -->|HTTPS| Nginx[Nginx Reverse Proxy on Host]
    
    subgraph TCL Environment (Network: supabase_default)
        Nginx -->|Port 3000| TCL_CRM[TCL CRM Frontend Container]
        Nginx -->|Port 8000| TCL_Kong[TCL Supabase Kong API Gateway]
        TCL_CRM -->|Internal DNS| TCL_Kong
        TCL_Kong --> TCL_DB[(TCL Postgres DB)]
    end

    subgraph TMF Environment (Network: supabase-tmf_default)
        Nginx -->|Port 3001| TMF_CRM[TMF CRM Frontend Container]
        Nginx -->|Port 8011| TMF_Kong[TMF Supabase Kong API Gateway]
        TMF_CRM -->|Internal DNS| TMF_Kong
        TMF_Kong --> TMF_DB[(TMF Postgres DB)]
    end
```

---

## 2. Infrastructure Specifications

*   **Host Server**: Ubuntu 24.04 LTS (`49.249.53.189`)
*   **Container Runtime**: Docker & Docker Compose
*   **Reverse Proxy**: Nginx (installed on host system)
*   **Database Engine**: PostgreSQL 15 (Supabase bundle)

---

## 3. Network Routing & Port Allocation

Nginx on the host manages SSL termination and routes requests to the correct Docker container ports based on subdomain configuration:

| Domain | Target Container / Service | Host Port | Internal Docker URL (from CRM) |
| :--- | :--- | :--- | :--- |
| **crm.goalcryst.co.in** | TCL Next.js CRM Frontend | `3000` | N/A (Client Facing) |
| **api.goalcryst.co.in** | TCL Supabase Kong API Gateway | `8000` | `http://supabase-kong:8000` |
| **tmf.goalcryst.co.in** | TMF Next.js CRM Frontend | `3001` | N/A (Client Facing) |
| **tmf-api.goalcryst.co.in** | TMF Supabase Kong API Gateway | `8011` | `http://supabase-tmf-kong:8000` |

---

## 4. NAT Loopback Prevention (Split-Routing)

### The Problem
When the CRM frontend container makes server-side calls (e.g. Next.js Server Actions or API routes) using the public Supabase URL (`https://api.goalcryst.co.in`), the request leaves the server, loops back through the external router, and tries to hit the public IP. On many network setups, this results in network timeouts, high latency, or routing failures (NAT loopback issue).

### The Solution
We use a **Split-Routing** pattern using separate environment variables:
1.  `NEXT_PUBLIC_SUPABASE_URL`: Pointed to the **public** external API URL. Used by client-side browser requests.
2.  `SUPABASE_INTERNAL_URL`: Pointed directly to the **internal** Kong container hostname on the shared Docker bridge network. Used by Server Actions and server-side operations for maximum speed and security.

#### Configuration in `.env.production` / `.env.docker`:
```ini
# Client-side (Public Network)
NEXT_PUBLIC_SUPABASE_URL=https://api.goalcryst.co.in
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side (Docker Internal Network)
SUPABASE_INTERNAL_URL=http://supabase-kong:8000
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## 5. Docker Compose Configurations

### A. Next.js App Service block (TCL)
```yaml
services:
  goalcryst-crm-tcl:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: goalcryst-crm-tcl
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    networks:
      - supabase_default
    restart: always

networks:
  supabase_default:
    external: true
```

### B. Next.js App Service block (TMF)
```yaml
services:
  goalcryst-crm-tmf:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: goalcryst-crm-tmf
    ports:
      - "3001:3000"
    env_file:
      - .env.production
    networks:
      - supabase-tmf_default
    restart: always

networks:
  supabase-tmf_default:
    external: true
```

---

## 6. Build & Deployment Workflows

To deploy updates to the application containers on the production host server:

### Step 1: SSH onto the Host Server
```bash
ssh goalcryst@49.249.53.189
# Enter Password: GoalcrystP@ssw0rd
sudo su
# Enter Password: GoalcrystP@ssw0rd
```

### Step 2: Navigate and Pull Latest Code
*   **TCL**: `cd /apps/app1/goalcryst-crm-tcl` (verify path on host)
*   **TMF**: `cd /apps/app2/goalcryst-crm-tmf` (verify path on host)

```bash
git checkout main
git pull origin main
```

### Step 3: Rebuild and Restart Containers
Use the Docker Compose build cache to minimize compile times:

```bash
# Rebuild the container image with production args
docker compose build --no-cache

# Bring container up in detached mode
docker compose up -d
```

### Step 4: Verify Container Logs & Health
```bash
docker ps
docker logs -f <container_name> --tail 100
```
