# Challenge 1: S3 Storage Integration - Solution

## Implementation Summary

Successfully implemented self-hosted S3-compatible storage using **MinIO** for the Delineate Hackathon Challenge.

## Changes Made

### 1. Docker Compose Configuration

#### Development Environment (`docker/compose.dev.yml`)

- Added **MinIO** service for S3-compatible storage
- Added **MinIO Init** service to automatically create the `downloads` bucket
- Configured networking between services
- Added environment variables for S3 connectivity
- Implemented health checks for proper startup sequencing

#### Production Environment (`docker/compose.prod.yml`)

- Same MinIO setup as development
- Added restart policies for production reliability

### 2. Dockerfile Updates

#### Development Dockerfile (`docker/Dockerfile.dev`)

- Added empty `.env` file creation to support Node's `--env-file` flag
- Environment variables are provided by Docker Compose

#### Production Dockerfile (`docker/Dockerfile.prod`)

- Added empty `.env` file creation with proper permissions for the `node` user

### 3. Environment Configuration

The following S3 environment variables are automatically configured in Docker Compose:

```env
S3_ENDPOINT=http://delineate-minio:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=downloads
S3_FORCE_PATH_STYLE=true
```

## MinIO Service Details

- **Service Name**: `delineate-minio`
- **Storage Port**: 9000 (accessible at http://localhost:9000)
- **Console Port**: 9001 (accessible at http://localhost:9001)
- **Credentials**: minioadmin / minioadmin
- **Bucket Name**: `downloads`
- **Bucket Access**: Public (for demo purposes)

## Verification

### ✅ All Requirements Met

- [x] S3-compatible storage service added to Docker Compose
- [x] `downloads` bucket created automatically on startup
- [x] Proper networking configured between services
- [x] Environment variables configured for API-storage connection
- [x] All E2E tests pass (29/29)
- [x] Health endpoint returns `{"status":"healthy","checks":{"storage":"ok"}}`

### Test Results

```bash
# Health Check
$ curl http://localhost:3000/health
{"status":"healthy","checks":{"storage":"ok"}}

# Download Check
$ curl -X POST http://localhost:3000/v1/download/check \
  -H "Content-Type: application/json" \
  -d '{"file_id": 70000}'
{"file_id":70000,"available":false,"s3Key":null,"size":null}

# Download Initiate
$ curl -X POST http://localhost:3000/v1/download/initiate \
  -H "Content-Type: application/json" \
  -d '{"file_ids": [70000, 70001]}'
{"jobId":"68628af2-a5ad-4c05-ab09-92572ca07454","status":"queued","totalFileIds":2}

# E2E Test Results
Total:  29
Passed: 29
Failed: 0
All tests passed! ✓
```

## How to Run

### Development Mode

```bash
# Start all services
npm run docker:dev

# Or manually
docker compose -f docker/compose.dev.yml up --build

# Stop services
docker compose -f docker/compose.dev.yml down
```

### Production Mode

```bash
npm run docker:prod

# Or manually
docker compose -f docker/compose.prod.yml up --build -d
```

### Run E2E Tests

```bash
npm run test:e2e
```

## Accessing MinIO Console

You can access the MinIO web console at:

- **URL**: http://localhost:9001
- **Username**: minioadmin
- **Password**: minioadmin

Here you can:

- View the `downloads` bucket
- Upload/download files
- Manage access policies
- Monitor storage usage

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Docker Network                    │
│                                                      │
│  ┌──────────────────┐      ┌──────────────────┐    │
│  │  Delineate App   │──────│  MinIO Storage   │    │
│  │  (Node.js API)   │      │  (S3 Compatible) │    │
│  │  Port: 3000      │      │  Port: 9000      │    │
│  └──────────────────┘      └──────────────────┘    │
│         │                           │               │
│         │                           │               │
│  ┌──────────────────┐      ┌──────────────────┐    │
│  │  Jaeger Tracing  │      │  MinIO Init      │    │
│  │  Port: 16686     │      │  (Bucket Setup)  │    │
│  └──────────────────┘      └──────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Key Implementation Details

### Automatic Bucket Creation

The `delineate-minio-init` service automatically:

1. Waits for MinIO to be healthy
2. Configures MinIO client (`mc`) with credentials
3. Creates the `downloads` bucket (if it doesn't exist)
4. Sets the bucket to public access
5. Exits after successful setup

### Health Checks

- MinIO has a health check using `mc ready local`
- The app container waits for MinIO to be healthy before starting
- The app's `/health` endpoint verifies S3 connectivity

### Service Communication

Services communicate using Docker's internal DNS:

- `http://delineate-minio:9000` for S3 API
- `http://delineate-jaeger:4318` for OpenTelemetry

## Troubleshooting

### View Container Logs

```bash
# App logs
docker compose -f docker/compose.dev.yml logs delineate-app

# MinIO logs
docker compose -f docker/compose.dev.yml logs delineate-minio

# Bucket initialization logs
docker compose -f docker/compose.dev.yml logs delineate-minio-init
```

### Check Container Status

```bash
docker compose -f docker/compose.dev.yml ps
```

### Restart Services

```bash
docker compose -f docker/compose.dev.yml restart
```

## Next Steps

With Challenge 1 complete, you can now:

1. **Challenge 2**: Design architecture for long-running downloads
2. **Challenge 3**: Set up CI/CD pipeline
3. **Challenge 4**: Build observability dashboard (bonus)

## Additional Notes

- The MinIO data persists in a Docker volume (`minio-data`)
- To reset storage, remove the volume: `docker volume rm delineate_minio-data`
- MinIO is fully S3-compatible, so the code can easily switch to AWS S3 or other providers
- For production, consider using separate credentials and proper access policies
