#!/bin/bash
# Initialize SQS queues in LocalStack for local development and testing

set -e

echo "Waiting for LocalStack to be ready..."
until curl -s http://localhost:4566/_localstack/health | grep -q '"sqs": "available"'; do
  echo "LocalStack not ready yet, retrying in 2 seconds..."
  sleep 2
done

echo "LocalStack is ready. Creating SQS queues..."

# Set AWS CLI to use LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=eu-west-3

# Create solve DLQ
echo "Creating solve DLQ..."
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name nsp-pro-dev-solve-dlq \
  --attributes MessageRetentionPeriod=1209600 \
  2>/dev/null || echo "Solve DLQ already exists"

# Get the DLQ ARN for the redrive policy
SOLVE_DLQ_ARN=$(aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/nsp-pro-dev-solve-dlq \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "Solve DLQ ARN: $SOLVE_DLQ_ARN"

# Create solve queue with DLQ redrive policy
echo "Creating solve queue..."
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name nsp-pro-dev-solve-queue \
  --attributes "{
    \"VisibilityTimeout\": \"900\",
    \"MessageRetentionPeriod\": \"1209600\",
    \"ReceiveMessageWaitTimeSeconds\": \"20\",
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$SOLVE_DLQ_ARN\\\",\\\"maxReceiveCount\\\":3}\"
  }" \
  2>/dev/null || echo "Solve queue already exists"

# Create email DLQ
echo "Creating email DLQ..."
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name nsp-pro-dev-email-dlq \
  --attributes MessageRetentionPeriod=1209600 \
  2>/dev/null || echo "Email DLQ already exists"

# Get the email DLQ ARN
EMAIL_DLQ_ARN=$(aws --endpoint-url=http://localhost:4566 sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/nsp-pro-dev-email-dlq \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "Email DLQ ARN: $EMAIL_DLQ_ARN"

# Create email queue with DLQ redrive policy
echo "Creating email queue..."
aws --endpoint-url=http://localhost:4566 sqs create-queue \
  --queue-name nsp-pro-dev-email-queue \
  --attributes "{
    \"VisibilityTimeout\": \"300\",
    \"MessageRetentionPeriod\": \"1209600\",
    \"ReceiveMessageWaitTimeSeconds\": \"20\",
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$EMAIL_DLQ_ARN\\\",\\\"maxReceiveCount\\\":3}\"
  }" \
  2>/dev/null || echo "Email queue already exists"

echo ""
echo "✅ SQS queues created successfully!"
echo ""
echo "Queue URLs:"
echo "  Solve Queue: http://localhost:4566/000000000000/nsp-pro-dev-solve-queue"
echo "  Solve DLQ:   http://localhost:4566/000000000000/nsp-pro-dev-solve-dlq"
echo "  Email Queue: http://localhost:4566/000000000000/nsp-pro-dev-email-queue"
echo "  Email DLQ:   http://localhost:4566/000000000000/nsp-pro-dev-email-dlq"
echo ""

# List all queues to verify
echo "Listing all SQS queues:"
aws --endpoint-url=http://localhost:4566 sqs list-queues
