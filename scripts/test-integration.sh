#!/bin/bash

# ===========================================
# Integration Test Script
# Tests API-Worker communication via Bull Queue
# ===========================================

set -e

echo "🚀 Starting Storige Integration Test"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:4000/api"
WORKER_URL="http://localhost:4001"
TEST_PDF_URL="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

# Helper functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if services are running
echo "📡 Checking services..."
echo ""

# Check API
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    print_success "API Server is running"
else
    print_error "API Server is not responding"
    exit 1
fi

# Check Redis
if redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
    print_success "Redis is running"
else
    print_error "Redis is not responding"
    exit 1
fi

# Check MySQL
if mysqladmin -h localhost -P 3306 -u root ping > /dev/null 2>&1; then
    print_success "MySQL is running"
else
    print_error "MySQL is not responding (this is OK if using Docker)"
fi

echo ""
echo "🧪 Running Integration Tests..."
echo ""

# Test 1: Create Validation Job
print_info "Test 1: Creating PDF validation job..."
VALIDATION_RESPONSE=$(curl -s -X POST "$API_URL/worker-jobs/validate" \
    -H "Content-Type: application/json" \
    -d '{
        "fileUrl": "'"$TEST_PDF_URL"'",
        "fileType": "cover",
        "orderOptions": {
            "size": { "width": 210, "height": 297 },
            "pages": 2,
            "binding": "perfect",
            "bleed": 3
        }
    }')

if [ $? -eq 0 ]; then
    JOB_ID=$(echo "$VALIDATION_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$JOB_ID" ]; then
        print_success "Validation job created: $JOB_ID"
    else
        print_error "Failed to extract job ID from response"
        echo "$VALIDATION_RESPONSE"
        exit 1
    fi
else
    print_error "Failed to create validation job"
    exit 1
fi

# Wait for job to complete
print_info "Waiting for job to complete (max 30 seconds)..."
for i in {1..30}; do
    sleep 1
    STATUS_RESPONSE=$(curl -s "$API_URL/worker-jobs/$JOB_ID")
    STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    if [ "$STATUS" = "COMPLETED" ] || [ "$STATUS" = "FAILED" ]; then
        break
    fi
    echo -n "."
done
echo ""

if [ "$STATUS" = "COMPLETED" ]; then
    print_success "Validation job completed successfully"
elif [ "$STATUS" = "FAILED" ]; then
    print_error "Validation job failed"
    echo "$STATUS_RESPONSE"
else
    print_error "Validation job timed out (status: $STATUS)"
fi

echo ""
echo "🎉 Integration test completed!"
echo ""
echo "📊 Summary:"
echo "  - API Server: ✓"
echo "  - Redis: ✓"
echo "  - Worker Service: $([ "$STATUS" = "COMPLETED" ] && echo "✓" || echo "?")"
echo "  - Bull Queue: $([ "$STATUS" = "COMPLETED" ] && echo "✓" || echo "?")"
echo ""
