#!/bin/bash
# Test script for new API endpoints

API_URL="${1:-http://localhost:3846}"

echo "Testing AgentPass API endpoints..."
echo "API URL: $API_URL"
echo ""

# Test GET /passports
echo "1. Testing GET /passports"
curl -s "$API_URL/passports" | jq '.' || echo "Failed"
echo ""

# Test GET /audit
echo "2. Testing GET /audit"
curl -s "$API_URL/audit" | jq '.' || echo "Failed"
echo ""

# Test POST /passports (create a test passport)
echo "3. Testing POST /passports"
curl -s -X POST "$API_URL/passports" \
  -H "Content-Type: application/json" \
  -d '{
    "public_key": "ed25519:test123456789",
    "owner_email": "test@example.com",
    "name": "test-agent",
    "description": "Test agent for API verification"
  }' | jq '.' || echo "Failed"
echo ""

echo "Test completed!"
