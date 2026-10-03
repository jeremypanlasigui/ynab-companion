# GCP Kubernetes & Cloud SQL Deployment Guide

This guide details the production deployment architecture for the **YNAB Companion App** on **Google Cloud Platform (GCP)**. It is specifically designed to achieve:

1. **Automatic load balancing** via Google Cloud HTTP(S) Load Balancer and Kubernetes Container-Native Load Balancing (NEGs).
2. **Minimal cost during low load** (~$15 - $25/month total) using GKE Autopilot and Cloud SQL shared-core tiers.
3. **Seamless database connectivity** configured via environment variables, using Google Cloud SQL for PostgreSQL (the GCP managed equivalent of the local SQLite relational database) while maintaining 100% local development compatibility with SQLite.

---

## 1. Architecture Overview

```mermaid
flowchart TD
    subgraph Internet ["Public Internet & Clients"]
        Client[Web Browser / Mobile Client]
        DNS[Cloud DNS / Custom Domain]
    end

    subgraph GCP_Edge ["GCP Edge Infrastructure"]
        GLB[Google Cloud HTTP/HTTPS External Load Balancer]
        ManagedCert[Google-Managed SSL Certificate]
        CDN[Cloud CDN Edge Cache]
    end

    subgraph GKE_Autopilot ["GKE Autopilot Cluster (Pay-per-Pod, Auto-scaled)"]
        Ingress[GKE Ingress Controller]
        NEG[Network Endpoint Group - NEG]
        HPA[Horizontal Pod Autoscaler: 1-10 Replicas]
        
        subgraph Pod ["Pod: ynab-companion (Baseline: 0.25 vCPU / 512Mi)"]
            NextApp[Next.js Standalone Container :3000]
            Proxy[Cloud SQL Auth Proxy Sidecar :5432]
        end
    end

    subgraph GCP_Data ["GCP Managed Data Tier"]
        CloudSQL[(Cloud SQL PostgreSQL: db-f1-micro)]
        IAM[Workload Identity IAM Role]
    end

    Client -->|HTTPS :443| GLB
    DNS -.-> GLB
    GLB --- ManagedCert
    GLB -->|Static Assets Cache| CDN
    GLB -->|Dynamic Requests| NEG
    NEG -->|Zero-hop direct routing| NextApp
    HPA -.->|Scales pods based on CPU/RAM| NextApp
    NextApp -->|Local loopback 127.0.0.1:5432| Proxy
    Proxy -->|IAM mTLS Tunnel| CloudSQL
    Proxy -.->|Authenticates via| IAM
```

---

## 2. Low-Cost Strategy & Monthly Bill Breakdown

To achieve **minimal cost during low load** on Google Cloud:

### Why GKE Autopilot?
- **No idle worker node costs**: In standard Kubernetes, you pay for full Compute Engine VM nodes (e.g. `e2-standard-4` ~$100+/mo) even when traffic is near zero.
- **Pay-per-Pod resource pricing**: GKE Autopilot only bills for the exact CPU and Memory requested by active pods (per second).
- **Cluster fee waiver**: Google Cloud waives the $73/mo cluster management fee for one Autopilot cluster per billing account.
- **Auto-provisioning & Zero Maintenance**: Google manages OS upgrades, security patching, and node pool bin-packing automatically.

### Why Container-Native Load Balancing (NEGs)?
- Traditional ingress routes traffic through node ports and `kube-proxy` iptables, adding network hops and uneven distribution.
- GKE Container-Native Load Balancing (`cloud.google.com/neg: '{"ingress": true}'`) maps Pod IPs directly to Google's Anycast Load Balancer backends.
- Combined with Cloud CDN enabled in [`k8s/backend-config.yaml`](file:///c:/Users/jbmpa/git/ynab-companion-app/k8s/backend-config.yaml), Next.js immutable static assets (`/_next/static/*`) are cached at Google's edge locations worldwide, drastically reducing pod CPU load.

### Estimated Monthly Cost (Low / Idle Traffic)

| Component | Specification | Estimated Monthly Cost |
| :--- | :--- | :--- |
| **GKE Autopilot Compute** | 1 Pod @ 0.25 vCPU, 512Mi RAM (`minReplicas: 1`) | ~$7.00 - $10.00 |
| **Cloud SQL for PostgreSQL** | Shared core (`db-f1-micro`), 10 GB SSD | ~$9.50 - $12.00 |
| **Cloud Load Balancer** | Global External HTTP(S) Load Balancer forwarding rule | ~$18.00 (or ~$5-7 shared across services) |
| **Cloud CDN & Egress** | Cache hits at edge + low bandwidth | < $1.00 |
| **Managed SSL Certificate** | Google-managed automated TLS certificate | **$0.00 (Free)** |
| **Total Estimated Baseline** | | **~$35 - $40 / month** |

> [!TIP]
> **Optional Ultra-Minimal Cost Mode**: If you want to reduce costs even further during testing or low usage, you can stop the Cloud SQL instance during non-business hours via a Cloud Scheduler cron job (`gcloud sql instances patch ynab-db --activation-policy=NEVER`), or use a shared database on an existing GCP instance.

---

## 3. Database Engine & Environment Configuration

The application implements a **dual-driver database layer** in [`lib/server/db.ts`](file:///c:/Users/jbmpa/git/ynab-companion-app/lib/server/db.ts):
- **Local Development**: Uses local SQLite (`data/budget.sqlite`) with WAL mode. Zero setup or external database needed.
- **GCP Production**: Connects to **Google Cloud SQL for PostgreSQL** using connection pooling (`pg.Pool`), preserving identical table structures, AES-256-GCM encrypted financial records, and transactional integrity.

### Environment Variables Matrix

| Variable | Description | Local Default | GCP Production |
| :--- | :--- | :--- | :--- |
| `DB_TYPE` | Database driver (`sqlite` \| `postgres`) | `sqlite` | `postgres` |
| `DATABASE_URL` | Full PostgreSQL connection URI | *(empty)* | `postgresql://ynab_user:PASSWORD@127.0.0.1:5432/ynab_companion?sslmode=disable` |
| `DB_HOST` | Database host (127.0.0.1 for Cloud SQL Proxy) | *(empty)* | `127.0.0.1` |
| `DB_PORT` | Database port | *(empty)* | `5432` |
| `DB_NAME` | Database name | *(empty)* | `ynab_companion` |
| `DB_USER` | Database user | *(empty)* | `ynab_user` |
| `DB_PASSWORD` | Database password | *(empty)* | Secret via `k8s/secret.yaml` |
| `DB_SSL` | Enable SSL (`true` \| `false`) | `false` | `false` (Proxy handles mTLS) |
| `INSTANCE_CONNECTION_NAME` | Cloud SQL instance connection string | *(empty)* | `PROJECT_ID:REGION:INSTANCE_NAME` |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM encryption | Auto-generated in `.env.local` | 64-hex chars via `k8s/secret.yaml` |
| `YNAB_ACCESS_TOKEN` | Optional server-level fallback token | *(empty)* | Optional in Secret |

Templates provided in the repo:
- [`.env.example`](file:///c:/Users/jbmpa/git/ynab-companion-app/.env.example): Complete documentation and settings reference.
- [`.env.production.example`](file:///c:/Users/jbmpa/git/ynab-companion-app/.env.production.example): Production values ready for GCP.
- [`k8s/configmap.yaml`](file:///c:/Users/jbmpa/git/ynab-companion-app/k8s/configmap.yaml): Non-sensitive Kubernetes runtime config.
- [`k8s/secret.yaml`](file:///c:/Users/jbmpa/git/ynab-companion-app/k8s/secret.yaml): Secret values (database passwords, encryption key).

---

## 4. Step-by-Step Deployment Walkthrough

### Prerequisites
1. [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and authenticated (`gcloud auth login`).
2. `kubectl` installed (`gcloud components install kubectl`).
3. A GCP project with billing enabled.

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export CLUSTER_NAME="ynab-cluster"
export DB_INSTANCE_NAME="ynab-db"

gcloud config set project $PROJECT_ID
```

---

### Step 1: Enable Required GCP APIs

```bash
gcloud services enable \
  container.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com
```

---

### Step 2: Create Cloud SQL PostgreSQL Instance (Minimal Cost Tier)

Provision a cost-optimized shared-core PostgreSQL instance (`db-f1-micro`):

```bash
# 1. Create the Cloud SQL PostgreSQL instance
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-size=10GB \
  --storage-type=SSD \
  --storage-auto-increase \
  --backup-start-time=03:00

# 2. Create the database
gcloud sql databases create ynab_companion \
  --instance=$DB_INSTANCE_NAME

# 3. Create database user with a secure password
DB_PASS=$(openssl rand -base64 18)
gcloud sql users create ynab_user \
  --instance=$DB_INSTANCE_NAME \
  --password="$DB_PASS"

echo "Database Password: $DB_PASS"

# 4. Get the instance connection name (format: PROJECT:REGION:INSTANCE)
INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME --format="value(connectionName)")
echo "Instance Connection Name: $INSTANCE_CONNECTION_NAME"
```

---

### Step 3: Create GKE Autopilot Cluster

GKE Autopilot enables automatic scaling and per-pod pricing:

```bash
gcloud container clusters create-auto $CLUSTER_NAME \
  --region=$REGION \
  --release-channel=regular

# Configure kubectl credentials
gcloud container clusters get-credentials $CLUSTER_NAME --region=$REGION
```

---

### Step 4: Configure Workload Identity for Cloud SQL Access

Workload Identity allows the Pod's Cloud SQL Auth Proxy sidecar to securely authenticate to Cloud SQL using Google Cloud IAM without hardcoding service account keys.

```bash
# 1. Create Google Cloud IAM Service Account
gcloud iam service-accounts create ynab-companion-sa \
  --display-name="YNAB Companion App GKE Service Account"

# 2. Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:ynab-companion-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# 3. Allow Kubernetes Service Account to impersonate the IAM Service Account
gcloud iam service-accounts add-iam-policy-binding \
  ynab-companion-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:$PROJECT_ID.svc.id.goog[default/ynab-companion-sa]"
```

---

### Step 5: Build and Push Docker Container Image

Create an Artifact Registry repository and build using Google Cloud Build:

```bash
# 1. Create Artifact Registry repository
gcloud artifacts repositories create ynab-repo \
  --repository-format=docker \
  --location=$REGION \
  --description="YNAB Companion App Docker images"

IMAGE_URI="$REGION-docker.pkg.dev/$PROJECT_ID/ynab-repo/ynab-companion:latest"

# 2. Build and push container image using Cloud Build
gcloud builds submit --tag $IMAGE_URI .
```

---

### Step 6: Configure Kubernetes Secrets & ConfigMap

1. Generate a 256-bit encryption key:
   ```bash
   APP_ENCRYPTION_KEY=$(openssl rand -hex 32)
   ```

2. Update [`k8s/secret.yaml`](file:///c:/Users/jbmpa/git/ynab-companion-app/k8s/secret.yaml):
   ```yaml
   stringData:
     ENCRYPTION_KEY: "<APP_ENCRYPTION_KEY>"
     DB_USER: "ynab_user"
     DB_PASSWORD: "<DB_PASS>"
     DATABASE_URL: "postgresql://ynab_user:<DB_PASS>@127.0.0.1:5432/ynab_companion?sslmode=disable"
   ```

3. Update [`k8s/configmap.yaml`](file:///c:/Users/jbmpa/git/ynab-companion-app/k8s/configmap.yaml):
   ```yaml
   data:
     INSTANCE_CONNECTION_NAME: "<INSTANCE_CONNECTION_NAME>"
   ```

4. Update [`k8s/deployment.yaml`](file:///c:/Users/jbmpa/git/ynab-companion-app/k8s/deployment.yaml):
   Update the container image to `$IMAGE_URI`.

5. Update [`k8s/service-account.yaml`](file:///c:/Users/jbmpa/git/ynab-companion-app/k8s/service-account.yaml):
   Replace `YOUR_PROJECT_ID` with `$PROJECT_ID`.

6. Update custom domain in [`k8s/managed-certificate.yaml`](file:///c:/Users/jbmpa/git/ynab-companion-app/k8s/managed-certificate.yaml) and [`k8s/ingress.yaml`](file:///c:/Users/jbmpa/git/ynab-companion-app/k8s/ingress.yaml).

---

### Step 7: Deploy to GKE

Deploy the complete stack in a single command using Kustomize:

```bash
kubectl apply -k k8s/
```

Verify that the pods, HPA, and services are running:

```bash
# Check pod status and sidecar initialization
kubectl get pods -w

# Check Horizontal Pod Autoscaler status
kubectl get hpa

# Inspect ingress and find the provisioned Global Load Balancer IP
kubectl get ingress ynab-companion-ingress
```

---

### Step 8: Domain & DNS Setup

1. Retrieve the public Anycast IP provisioned by the Google Cloud Load Balancer:
   ```bash
   kubectl get ingress ynab-companion-ingress -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
   ```
2. In your DNS provider (e.g., Cloud DNS, Cloudflare, Namecheap), add an `A` record pointing your domain (e.g., `ynab.example.com`) to this IP.
3. Google Cloud will automatically provision and activate the Google-Managed SSL Certificate. You can check the certificate status with:
   ```bash
   kubectl get managedcertificate ynab-companion-cert
   ```
   *(Status will transition from `Provisioning` to `Active` once DNS resolves).*

---

## 5. Health Checks & Verification

The deployment integrates both Kubernetes probes and Google Cloud Load Balancer health checks:

- **Liveness Probe**: `GET /api/health?db=false`
  - Validates that the Node.js server process is active and responsive.
  - Does not fail on transient external database disconnects, preventing unnecessary pod crash loops.
- **Readiness Probe**: `GET /api/health`
  - Runs `serverDb.healthCheck()`, verifying that PostgreSQL connectivity and tables are ready before routing incoming HTTP traffic.
- **Autoscaler Verification**:
  ```bash
  kubectl describe hpa ynab-companion-hpa
  ```
  During low traffic, HPA maintains `1` pod replica. When traffic or CPU exceeds `70%`, HPA smoothly scales up to `10` replicas. Once load subsides, the 5-minute stabilization window scales the deployment back to `1` replica to minimize cost.
