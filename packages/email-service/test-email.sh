#!/bin/bash

# Test script for sending a simulated email to local worker
# Usage: ./test-email.sh [agent-email]

WORKER_URL=${WORKER_URL:-"http://localhost:8787"}
AGENT_EMAIL=${1:-"test-agent@agentpass.dev"}

echo "🧪 Sending test email to: $AGENT_EMAIL"
echo "📍 Worker URL: $WORKER_URL"
echo ""

# This is a test endpoint we'll add to worker for development
curl -X POST "$WORKER_URL/test-email" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"$AGENT_EMAIL\",
    \"from\": \"github@email.github.com\",
    \"subject\": \"[GitHub] Please verify your email address\",
    \"body\": \"Hi,\\n\\nPlease verify your email by clicking the link below:\\n\\nhttps://github.com/verify?token=abc123xyz456&email=$AGENT_EMAIL\\n\\nYour verification code is: 482910\\n\\nThanks,\\nGitHub Team\",
    \"html\": \"<html><body><p>Hi,</p><p>Please verify your email by clicking the link below:</p><p><a href=\\\"https://github.com/verify?token=abc123xyz456&email=$AGENT_EMAIL\\\">Verify Email</a></p><p>Your verification code is: <strong>482910</strong></p><p>Thanks,<br>GitHub Team</p></body></html>\"
  }"

echo ""
echo ""
echo "✅ Test email sent!"
echo ""
echo "📥 Retrieve emails:"
echo "   curl $WORKER_URL/emails/$AGENT_EMAIL"
echo ""
