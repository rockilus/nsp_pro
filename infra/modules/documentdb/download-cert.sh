#!/bin/bash

# Download AWS DocumentDB TLS Certificate Bundle
# This script downloads the global certificate bundle required for TLS connections to DocumentDB

set -e

CERT_FILE="global-bundle.pem"
CERT_URL="https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"

echo "Downloading DocumentDB TLS certificate bundle..."

if command -v wget >/dev/null 2>&1; then
    wget -O "$CERT_FILE" "$CERT_URL"
elif command -v curl >/dev/null 2>&1; then
    curl -o "$CERT_FILE" "$CERT_URL"
else
    echo "Error: wget or curl is required to download the certificate bundle"
    exit 1
fi

echo "Certificate bundle downloaded successfully to $CERT_FILE"
echo ""
echo "Usage:"
echo "1. Place this file in your application's working directory"
echo "2. Reference it in your MongoDB connection string with tlsCAFile=global-bundle.pem"
echo "3. Example connection string:"
echo "   mongodb://username:password@docdb-cluster:27017/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false"
