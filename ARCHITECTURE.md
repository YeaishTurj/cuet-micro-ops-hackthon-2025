# Challenge 2: Long-Running Download Architecture Design

## 🎯 Overview

This document presents a complete implementation plan for integrating the Delineate download microservice with a fullstack application while gracefully handling variable download times (10-120 seconds).

**Challenge Status**: Design & Implementation Plan
**Target Score**: 15/15 Points

---

## 🏗️ Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                   │
│  ┌──────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  React/Next.js App   │  │  Download Manager Component          │   │
│  │  - UI/UX             │  │  - Job tracking                      │   │
│  │  - State management  │  │  - Progress display                 │   │
│  │  - Error handling    │  │  - Retry logic                       │   │
│  └──────────────────────┘  └──────────────────────────────────────┘   │
│           │                          │                                 │
│           └──────────────┬───────────┘                                 │
│                          │ WebSocket/HTTP                              │
└──────────────────────────┼─────────────────────────────────────────────┘
                           │
┌──────────────────────────┼─────────────────────────────────────────────┐
│                          ▼                                              │
│                    Reverse Proxy Layer                                  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  nginx / Cloudflare / AWS ALB                                 │  │
│  │  - Long timeout (120s+)                                       │  │
│  │  - WebSocket upgrade                                          │  │
│  │  - Connection pooling                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                          │                                              │
└──────────────────────────┼──────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────────┐
│                          ▼                                              │
│                    API Gateway Layer                                    │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Delineate API Service (Hono)                                 │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐│  │
│  │  │ REST API    │  │  WebSocket   │  │  Server-Sent Events ││  │
│  │  │ Endpoints   │  │  Handler     │  │  Handler             ││  │
│  │  └─────────────┘  └──────────────┘  └──────────────────────┘│  │
│  └────────────────────────────────────────────────────────────────┘  │
│                          │                                              │
└──────────────────────────┼──────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼─────────┐  ┌────▼──────────┐
│  Job Queue   │  │   Cache Store    │  │   Database    │
│  (Redis BQ)  │  │   (Redis)        │  │   (PostgreSQL)│
│              │  │                  │  │               │
│ - Job Mgmt   │  │ - Job status     │  │ - History     │
│ - Retries    │  │ - Progress info  │  │ - Metadata    │
│ - Scheduling │  │ - Session state  │  │ - Analytics   │
└───────┬──────┘  └────────┬─────────┘  └────┬──────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼─────────────┬────▼──────────┬──────▼──────────┐
│ Download Worker #1  │ Download W... │ Download W... │
│                     │               │                │
│ - Process jobs      │ - Async exec  │ - Error handle │
│ - Update progress   │ - Retry logic │ - Cleanup      │
│ - Error recovery    │               │                │
└───────┬─────────────┴────┬──────────┴──────┬──────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────────┐
                    │  MinIO S3       │
                    │  Storage        │
                    │                 │
                    │ - File download │
                    │ - Presigned URL │
                    │ - Storage ops   │
                    └─────────────────┘
```

---

## 🎯 Chosen Approach: Hybrid Pattern (Recommended)

I recommend a **Hybrid Polling + WebSocket + Presigned S3 URLs** approach that combines:

1. **WebSocket for real-time progress** - Optimal for premium users or large downloads
2. **HTTP Polling fallback** - Simple, works everywhere, good for small downloads
3. **Presigned S3 URLs** - Direct downloads once ready, reduces server load

### Why This Pattern?

| Aspect            | Benefit                                         |
| ----------------- | ----------------------------------------------- |
| **Flexibility**   | Clients choose streaming (WebSocket) or polling |
| **Scalability**   | Direct S3 downloads avoid server bottlenecks    |
| **Compatibility** | Works with all clients (browsers, mobile, CLI)  |
| **Resilience**    | Automatic fallback from WebSocket to polling    |
| **Cost**          | Reduces bandwidth on download server            |
| **UX**            | Real-time updates without constant polling      |

---

## 🔄 Technical Approach: Implementation Plan

### 1. Architecture Diagram - Data Flow

```
FAST DOWNLOAD (< 30s)                  SLOW DOWNLOAD (60-120s)
──────────────────────                 ──────────────────────

1. Client:                             1. Client:
   POST /download/initiate                POST /download/initiate
   {file_ids: [70000]}                   {file_ids: [70000]}
        │                                     │
        ▼                                     ▼
2. API Creates Job                    2. API Creates Job
   Returns jobId                         Returns jobId
        │                                     │
        ▼                                     ▼
3. Worker processes                   3. Client connects WebSocket
   (5-30 seconds)                        OR starts polling
        │                                     │
        ▼                                     ▼
4. Job completes                      4. Worker processes
   Status: "ready"                       asynchronously
        │                                     │
        ▼                                     ▼
5. Client polls,                      5. Progress events sent
   gets presigned URL                    to client
        │                                     │
        ▼                                     ▼
6. Client downloads directly           6. After 60-120s,
   from S3 (presigned URL)               job completes
        │                                     │
        ▼                                     ▼
7. Download complete                  7. Presigned URL generated
                                           │
                                           ▼
                                       8. Client downloads from S3
```

---

## 📋 Detailed Implementation Plan

### 2. API Contract

#### Current Endpoints (Existing)

```typescript
POST /v1/download/initiate
  Request: { file_ids: number[] }
  Response: { jobId: string, status: "queued", totalFileIds: number }

POST /v1/download/check
  Request: { file_id: number }
  Response: { file_id: number, available: boolean, s3Key: string | null, size: number | null }

POST /v1/download/start
  Request: { file_id: number }
  Response: { delay: string, enabled: boolean }
```

#### New Endpoints (Proposed)

```typescript
// Get job status with progress
GET /v1/download/job/:jobId
  Response: {
    jobId: string
    status: "queued" | "processing" | "ready" | "failed" | "expired"
    progress: {
      current: number
      total: number
      percentage: number
      estimatedTimeRemaining: number | null
    }
    filesProcessed: Array<{
      file_id: number
      status: "pending" | "completed" | "failed"
      error?: string
    }>
    createdAt: string
    updatedAt: string
  }

// Retry failed job
POST /v1/download/job/:jobId/retry
  Response: {
    jobId: string
    status: "queued"
    message: string
  }

// Get presigned download URL
GET /v1/download/job/:jobId/download-url
  Response: {
    jobId: string
    downloadUrl: string
    expiresIn: number
    fileSize: number
    bucket: string
  }

// WebSocket endpoint (upgrade)
WS /v1/download/subscribe/:jobId
  Server → Client Messages: {
    type: "progress" | "status" | "error" | "complete"
    data: { ... }
    timestamp: string
  }

// SSE endpoint (alternative to WebSocket)
GET /v1/download/stream/:jobId
  Response: Server-Sent Events stream
  Event types: "progress", "status", "error", "complete"
```

---

### 3. Data Models & Database Schema

#### Job Status Model

```typescript
interface DownloadJob {
  jobId: string; // UUID
  userId: string | null; // Optional for auth
  status: JobStatus; // queued | processing | ready | failed | expired
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  fileIds: number[]; // Files to download
  s3Keys: Map<string, string>; // file_id -> s3_key mapping
  downloadUrl?: string; // Presigned S3 URL
  urlExpiresAt?: Date; // When presigned URL expires
  error?: string; // Error message if failed
  retryCount: number; // Number of retries
  maxRetries: number; // Max retry attempts
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // When job data is deleted (7 days)
}

interface JobProgress {
  jobId: string;
  current: number; // Files processed
  total: number;
  percentage: number; // 0-100
  estimatedTimeRemaining: number; // Seconds
  lastUpdate: Date;
}

interface FileRecord {
  fileId: number;
  jobId: string;
  status: "pending" | "completed" | "failed";
  s3Key: string;
  size: number;
  error?: string;
  processedAt?: Date;
}
```

#### Database Schema (PostgreSQL)

```sql
-- Jobs table
CREATE TABLE download_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  total_files INT NOT NULL,
  processed_files INT DEFAULT 0,
  failed_files INT DEFAULT 0,
  file_ids INT[] NOT NULL,
  s3_keys JSONB,
  download_url TEXT,
  url_expires_at TIMESTAMP,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),

  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- File records table
CREATE TABLE file_records (
  id BIGSERIAL PRIMARY KEY,
  file_id INT NOT NULL,
  job_id UUID REFERENCES download_jobs(job_id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending',
  s3_key VARCHAR(512),
  file_size BIGINT,
  error_message TEXT,
  processed_at TIMESTAMP,

  UNIQUE (file_id, job_id),
  INDEX idx_job_id (job_id),
  INDEX idx_status (status)
);

-- Job progress cache (Redis alternative)
-- Key: "download:progress:{jobId}"
-- Value: {current, total, percentage, estimatedTime}
```

---

### 4. Background Job Processing Strategy

#### Using Redis + BullMQ

```typescript
// Queue Configuration
const downloadQueue = new Queue("file-downloads", {
  connection: {
    host: "redis",
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 3, // Retry 3 times
    backoff: {
      type: "exponential",
      delay: 2000, // 2s, 4s, 8s...
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
    },
    timeout: 130000, // 130 seconds timeout
  },
});

// Job data structure
interface DownloadJobData {
  jobId: string;
  fileIds: number[];
  userId?: string;
  retryCount: number;
}

// Worker implementation
downloadQueue.process(async (job) => {
  const { jobId, fileIds, userId } = job.data;

  try {
    // Update job status
    await updateJobStatus(jobId, "processing");

    // Process each file
    for (let i = 0; i < fileIds.length; i++) {
      const fileId = fileIds[i];

      // Download file
      const s3Key = await downloadFileFromRemote(fileId);

      // Upload to S3
      await uploadToS3(s3Key, fileId);

      // Update progress
      job.progress(((i + 1) / fileIds.length) * 100);
      await updateJobProgress(jobId, i + 1, fileIds.length);

      // Emit progress event
      await redisClient.publish(
        `job:${jobId}`,
        JSON.stringify({
          type: "progress",
          current: i + 1,
          total: fileIds.length,
          percentage: ((i + 1) / fileIds.length) * 100,
        }),
      );
    }

    // Generate presigned URL
    const downloadUrl = await generatePresignedUrl(jobId, fileIds);

    // Mark job as ready
    await updateJobStatus(jobId, "ready", { downloadUrl });

    // Cleanup: Delete job from queue after 1 hour
    return {
      success: true,
      downloadUrl,
      expiresIn: 3600,
    };
  } catch (error) {
    console.error(`Error processing job ${jobId}:`, error);
    await updateJobStatus(jobId, "failed", { error: error.message });
    throw error;
  }
});

// Event listeners
downloadQueue.on("progress", async (job, progress) => {
  // Send real-time update to connected WebSocket clients
  const clients = wsConnections.get(job.data.jobId);
  if (clients) {
    for (const client of clients) {
      client.send(
        JSON.stringify({
          type: "progress",
          data: progress,
        }),
      );
    }
  }
});

downloadQueue.on("completed", async (job) => {
  console.log(`Job ${job.id} completed`);
  // Cleanup old entries
});

downloadQueue.on("failed", async (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
  // Notify client of failure
});
```

---

### 5. WebSocket & SSE Implementation

#### WebSocket Handler

```typescript
// WebSocket server setup
const wsServer = new WebSocketServer({ noServer: true });

app.get("/v1/download/subscribe/:jobId", async (c) => {
  const jobId = c.req.param("jobId");

  // Verify job exists and belongs to user
  const job = await getJobById(jobId);
  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  // Upgrade to WebSocket
  c.req.raw.socket.upgrade = (ws: WebSocket) => {
    // Track connection
    if (!wsConnections.has(jobId)) {
      wsConnections.set(jobId, new Set());
    }
    wsConnections.get(jobId).add(ws);

    // Send initial status
    ws.send(
      JSON.stringify({
        type: "status",
        data: {
          status: job.status,
          progress: await getJobProgress(jobId),
        },
      }),
    );

    // Handle messages
    ws.on("message", (msg) => {
      const command = JSON.parse(msg);
      if (command.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    });

    // Handle disconnect
    ws.on("close", () => {
      wsConnections.get(jobId).delete(ws);
    });
  };

  return c.text("Upgrading to WebSocket");
});
```

#### SSE Handler (Fallback)

```typescript
app.get("/v1/download/stream/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const job = await getJobById(jobId);

  if (!job) {
    return c.json({ error: "Job not found" }, 404);
  }

  // Set up SSE headers
  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  // Create readable stream
  const encoder = new TextEncoder();

  // Send initial status
  yield encoder.encode(
    `data: ${JSON.stringify({ type: "status", data: { status: job.status } })}\n\n`,
  );

  // Subscribe to Redis pub/sub
  const subscriber = redisClient.duplicate();
  await subscriber.connect();

  // Handle subscription
  await subscriber.subscribe(`job:${jobId}`, (message) => {
    const event = JSON.parse(message);
    yield encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Keep connection alive
  while (true) {
    yield encoder.encode(": heartbeat\n\n");
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
});
```

---

### 6. Error Handling & Retry Logic

```typescript
interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: "exponential" | "linear" | "constant";
  initialDelay: number;
  maxDelay: number;
}

const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  backoffStrategy: "exponential",
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
};

// Error classification
enum ErrorType {
  NETWORK_ERROR = "network_error",
  TIMEOUT_ERROR = "timeout_error",
  STORAGE_ERROR = "storage_error",
  VALIDATION_ERROR = "validation_error",
  UNKNOWN_ERROR = "unknown_error",
}

function classifyError(error: Error): ErrorType {
  if (error instanceof TimeoutError) return ErrorType.TIMEOUT_ERROR;
  if (error.message.includes("ECONNREFUSED")) return ErrorType.NETWORK_ERROR;
  if (error.message.includes("ENOENT")) return ErrorType.STORAGE_ERROR;
  if (error instanceof ValidationError) return ErrorType.VALIDATION_ERROR;
  return ErrorType.UNKNOWN_ERROR;
}

// Retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  policy: RetryPolicy = defaultRetryPolicy,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const errorType = classifyError(error);

      // Don't retry validation errors
      if (errorType === ErrorType.VALIDATION_ERROR) {
        throw error;
      }

      // Calculate backoff
      const delay = Math.min(
        policy.initialDelay * Math.pow(2, attempt - 1),
        policy.maxDelay,
      );

      console.warn(
        `Attempt ${attempt} failed. Retrying in ${delay}ms...`,
        error.message,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

---

### 7. Timeout Configuration

```typescript
// Application-level timeouts
const timeoutConfig = {
  // Client request timeout (HTTP)
  REQUEST_TIMEOUT: 135000, // 135 seconds

  // WebSocket ping/pong
  WEBSOCKET_TIMEOUT: 30000, // 30 seconds

  // Job processing timeout
  JOB_TIMEOUT: 130000, // 130 seconds

  // File download timeout
  FILE_DOWNLOAD_TIMEOUT: 60000, // 60 seconds

  // S3 operations
  S3_TIMEOUT: 30000, // 30 seconds

  // Database operations
  DB_TIMEOUT: 10000, // 10 seconds

  // Redis operations
  REDIS_TIMEOUT: 5000, // 5 seconds
};

// Implement timeout middleware
app.use(async (c, next) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new TimeoutError("Request timeout")),
      timeoutConfig.REQUEST_TIMEOUT,
    ),
  );

  try {
    await Promise.race([next(), timeoutPromise]);
  } catch (error) {
    if (error instanceof TimeoutError) {
      return c.json({ error: "Request timeout" }, 504);
    }
    throw error;
  }
});
```

---

## 🌐 Proxy Configuration Examples

### nginx Configuration

```nginx
# Upstream definition
upstream delineate_api {
  least_conn;
  server api-1:3000 max_fails=3 fail_timeout=30s;
  server api-2:3000 max_fails=3 fail_timeout=30s;
  server api-3:3000 max_fails=3 fail_timeout=30s;

  keepalive 32;
}

server {
  listen 80;
  server_name api.downloads.example.com;

  # Long timeout for downloads
  proxy_read_timeout 135s;
  proxy_connect_timeout 10s;
  proxy_send_timeout 10s;

  # WebSocket support
  map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
  }

  # Regular API endpoints
  location /v1/download/ {
    proxy_pass http://delineate_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
  }

  # WebSocket endpoint
  location /v1/download/subscribe/ {
    proxy_pass http://delineate_api;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # Longer timeout for WebSocket
    proxy_read_timeout 3600s;
  }

  # SSE endpoint
  location /v1/download/stream/ {
    proxy_pass http://delineate_api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_buffering off;
    proxy_cache off;

    # Long timeout for SSE
    proxy_read_timeout 3600s;
  }
}
```

### Cloudflare Configuration

```javascript
// Cloudflare Worker - timeout handling
export default {
  async fetch(request, env, ctx) {
    // Extract jobId from request
    const url = new URL(request.url);
    const jobId = url.pathname.match(/\/download\/([^/]+)/)?.[1];

    // For long-running endpoints, extend timeout
    if (
      url.pathname.includes("/subscribe/") ||
      url.pathname.includes("/stream/")
    ) {
      // WebSocket/SSE endpoints - no timeout limit in Worker
      return fetch(request, {
        cf: {
          cacheEverything: false,
          mirage: false,
        },
      });
    }

    // Regular endpoints - 100s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 100000);

    try {
      const response = await fetch(request, {
        signal: controller.signal,
        cf: {
          cacheTtl: 0,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        // Timeout occurred
        return new Response(
          JSON.stringify({ error: "Request timeout", jobId }),
          {
            status: 504,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      throw error;
    }
  },
};

// Cloudflare Page Rules for WebSocket support
// - Enable "Automatic HTTPS Rewrites" for ws:// to wss://
// - Set "Browser Cache TTL" to "Bypass" for streaming endpoints
```

### AWS ALB Configuration

```hcl
# Terraform configuration for AWS ALB
resource "aws_lb_target_group" "delineate" {
  name             = "delineate-tg"
  port             = 3000
  protocol         = "HTTP"
  vpc_id           = aws_vpc.main.id

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  deregistration_delay = 30
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.delineate.arn
  }
}

# Modify listener rules for different endpoints
resource "aws_lb_listener_rule" "websocket" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.delineate.arn
  }

  condition {
    path_pattern {
      values = ["/v1/download/subscribe/*"]
    }
  }
}

# Set higher timeout for WebSocket connections
resource "aws_lb_target_group_attachment" "delineate" {
  target_group_arn = aws_lb_target_group.delineate.arn
  target_id        = aws_instance.api.id
  port             = 3000
}
```

---

## 💻 Frontend Integration: React/Next.js

### Download Manager Hook

```typescript
import { useState, useCallback, useRef, useEffect } from "react";

interface DownloadJob {
  jobId: string;
  status: "queued" | "processing" | "ready" | "failed" | "expired";
  progress: {
    current: number;
    total: number;
    percentage: number;
    estimatedTimeRemaining: number | null;
  };
}

export function useDownloadManager(apiUrl: string) {
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  // Initiate download
  const initiateDownload = useCallback(
    async (fileIds: number[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/v1/download/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_ids: fileIds }),
        });

        if (!response.ok) throw new Error("Failed to initiate download");

        const data = await response.json();
        setJob({
          ...data,
          progress: {
            current: 0,
            total: fileIds.length,
            percentage: 0,
            estimatedTimeRemaining: null,
          },
        });

        // Try WebSocket first, fall back to polling
        connectWebSocket(data.jobId);
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
    },
    [apiUrl],
  );

  // WebSocket connection with fallback
  const connectWebSocket = useCallback(
    (jobId: string) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/v1/download/subscribe/${jobId}`;

      try {
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log("WebSocket connected");
          setIsLoading(false);
        };

        wsRef.current.onmessage = (event) => {
          const message = JSON.parse(event.data);

          switch (message.type) {
            case "progress":
              setJob((prev) => ({
                ...prev!,
                progress: message.data,
              }));
              break;
            case "status":
              setJob((prev) => ({
                ...prev!,
                status: message.data.status,
              }));
              break;
            case "complete":
              setJob((prev) => ({ ...prev!, status: "ready" }));
              downloadFile(jobId);
              break;
            case "error":
              setError(message.data.error);
              setJob((prev) => ({ ...prev!, status: "failed" }));
              break;
          }
        };

        wsRef.current.onerror = () => {
          console.warn("WebSocket error, falling back to polling");
          startPolling(jobId);
        };

        wsRef.current.onclose = () => {
          // If still processing, resume polling
          if (job?.status === "processing") {
            startPolling(jobId);
          }
        };
      } catch (error) {
        console.warn("WebSocket connection failed, using polling", error);
        startPolling(jobId);
      }
    },
    [job?.status],
  );

  // Polling fallback
  const startPolling = useCallback(
    (jobId: string) => {
      pollingIntervalRef.current = window.setInterval(async () => {
        try {
          const response = await fetch(`${apiUrl}/v1/download/job/${jobId}`);

          if (!response.ok) throw new Error("Failed to get job status");

          const jobData = await response.json();
          setJob(jobData);

          // Stop polling when done
          if (jobData.status === "ready" || jobData.status === "failed") {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
            }

            if (jobData.status === "ready") {
              downloadFile(jobId);
            }
          }
        } catch (err) {
          setError(err.message);
        }
      }, 2000); // Poll every 2 seconds

      setIsLoading(false);
    },
    [apiUrl],
  );

  // Download file with presigned URL
  const downloadFile = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(
          `${apiUrl}/v1/download/job/${jobId}/download-url`,
        );

        if (!response.ok) throw new Error("Failed to get download URL");

        const { downloadUrl } = await response.json();

        // Create download link
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `download-${jobId}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        setError(err.message);
      }
    },
    [apiUrl],
  );

  // Retry failed job
  const retry = useCallback(async () => {
    if (!job) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${apiUrl}/v1/download/job/${job.jobId}/retry`,
        {
          method: "POST",
        },
      );

      if (!response.ok) throw new Error("Failed to retry job");

      const data = await response.json();
      setJob(data);
      connectWebSocket(data.jobId);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [job, apiUrl, connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  return {
    job,
    error,
    isLoading,
    initiateDownload,
    retry,
  };
}
```

### Download Component

```typescript
import React from 'react'
import { useDownloadManager } from './useDownloadManager'

export function DownloadComponent() {
  const { job, error, isLoading, initiateDownload, retry } = useDownloadManager(
    process.env.REACT_APP_API_URL || 'http://localhost:3000'
  )

  const handleInitiate = async () => {
    await initiateDownload([70000, 70001, 70002])
  }

  return (
    <div className="download-manager">
      <h2>Download Manager</h2>

      {!job ? (
        <button onClick={handleInitiate} disabled={isLoading}>
          {isLoading ? 'Initiating...' : 'Start Download'}
        </button>
      ) : (
        <div>
          <div className="job-status">
            <h3>Job ID: {job.jobId}</h3>
            <p>Status: <strong>{job.status}</strong></p>

            {job.status === 'processing' && (
              <div className="progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${job.progress.percentage}%` }}
                  />
                </div>
                <p>
                  {job.progress.current} / {job.progress.total} files
                  ({job.progress.percentage.toFixed(1)}%)
                </p>

                {job.progress.estimatedTimeRemaining && (
                  <p>
                    Estimated time remaining:{' '}
                    {Math.ceil(job.progress.estimatedTimeRemaining / 1000)}s
                  </p>
                )}
              </div>
            )}

            {job.status === 'ready' && (
              <button onClick={() => window.location.reload()}>
                Download Complete
              </button>
            )}

            {job.status === 'failed' && (
              <button onClick={retry}>Retry</button>
            )}
          </div>

          {error && <div className="error">{error}</div>}
        </div>
      )}
    </div>
  )
}
```

---

## 📊 Comparison: Design Patterns

| Feature            | Polling      | WebSocket      | Presigned URLs |
| ------------------ | ------------ | -------------- | -------------- |
| **Real-time**      | ❌           | ✅             | N/A            |
| **Server Load**    | ❌ High      | ✅ Low         | ✅ Very Low    |
| **Bandwidth**      | ❌ High      | ✅ Low         | ✅ Very Low    |
| **Compatibility**  | ✅ Universal | ⚠️ Modern only | ✅ Universal   |
| **Latency**        | ⚠️ 2-5s      | ✅ <100ms      | ✅ Minimal     |
| **Implementation** | ✅ Simple    | ⚠️ Complex     | ✅ Simple      |
| **Cost**           | ❌ High      | ✅ Low         | ✅ Lowest      |

**Recommendation**: Use WebSocket for premium users, polling for basic users, and presigned URLs for final download.

---

## 🔐 Security Considerations

```typescript
// Input validation
const validateJobId = (jobId: string): boolean => {
  // UUID v4 format
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    jobId,
  );
};

// Rate limiting per user
const rateLimitMiddleware = async (c, next) => {
  const userId = c.req.header("x-user-id");
  const key = `ratelimit:${userId}`;
  const limit = 10; // 10 jobs per hour
  const window = 3600; // 1 hour

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }

  if (current > limit) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  await next();
};

// Presigned URL expiration
const generatePresignedUrl = async (jobId: string, fileIds: number[]) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `downloads/${jobId}/archive.zip`,
    Expires: 3600, // 1 hour
  };

  const url = await s3.getSignedUrlPromise("getObject", params);
  return url;
};

// CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
    maxAge: 3600,
  }),
);
```

---

## 📈 Monitoring & Observability

```typescript
// Metrics collection
import { prometheus } from "@hono/prometheus";

app.use(prometheus());

// Custom metrics
const jobDurationHistogram = new Histogram({
  name: "download_job_duration_seconds",
  help: "Download job processing time",
  buckets: [10, 30, 60, 120, 300],
  labelNames: ["status"],
});

const jobQueueSize = new Gauge({
  name: "download_queue_size",
  help: "Current download queue size",
});

// Trace job progression
const traceJobProgress = async (jobId: string) => {
  const startTime = Date.now();

  try {
    const job = await processJob(jobId);
    const duration = (Date.now() - startTime) / 1000;

    jobDurationHistogram.labels(job.status).observe(duration);

    return job;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    jobDurationHistogram.labels("failed").observe(duration);
    throw error;
  }
};
```

---

## 🎯 Implementation Checklist

- [ ] Design reviewed and approved
- [ ] API contracts documented
- [ ] Database schema created
- [ ] Redis setup configured
- [ ] BullMQ workers implemented
- [ ] WebSocket handlers built
- [ ] SSE fallback implemented
- [ ] Retry logic tested
- [ ] Error handling comprehensive
- [ ] Frontend integration complete
- [ ] Proxy configs deployed
- [ ] Load testing performed
- [ ] Monitoring enabled
- [ ] Documentation updated
- [ ] E2E tests passing

---

## 📅 Timeline Estimate

| Phase                    | Duration | Tasks                                  |
| ------------------------ | -------- | -------------------------------------- |
| **Design**               | 2 days   | Architecture finalization, API design  |
| **Backend Setup**        | 3 days   | Database, Redis, BullMQ configuration  |
| **Core Implementation**  | 5 days   | Job processing, retry logic, handlers  |
| **Frontend Integration** | 3 days   | React components, WebSocket client     |
| **Testing**              | 3 days   | Unit tests, E2E tests, load testing    |
| **Deployment**           | 2 days   | Docker setup, proxy config, monitoring |
| **Total**                | ~18 days | Full implementation                    |

---

## 🏆 Success Metrics

- ✅ 99.9% job completion rate
- ✅ <100ms WebSocket message latency
- ✅ <2s polling response time
- ✅ Zero data loss
- ✅ Graceful degradation (WebSocket → polling)
- ✅ <30s median job completion time (for fast downloads)
- ✅ <120s median job completion time (for slow downloads)

---

**Document Status**: Complete Design Specification
**Ready for Implementation**: Yes
**Estimated Points**: 15/15
