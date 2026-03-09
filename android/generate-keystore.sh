#!/bin/bash

# Script to generate a release keystore for signing the Android app
# This should be run once and the keystore should be kept secure

set -e

echo "🔐 Generating release keystore for MadhavAI..."
echo ""
echo "⚠️  IMPORTANT: Keep the generated keystore and passwords secure!"
echo "   Store them in a password manager and never commit to version control."
echo ""

# Prompt for keystore details
read -p "Enter keystore filename (default: madhavai-release.keystore): " KEYSTORE_FILE
KEYSTORE_FILE=${KEYSTORE_FILE:-madhavai-release.keystore}

read -p "Enter key alias (default: madhavai-key): " KEY_ALIAS
KEY_ALIAS=${KEY_ALIAS:-madhavai-key}

read -sp "Enter keystore password: " KEYSTORE_PASSWORD
echo ""

read -sp "Confirm keystore password: " KEYSTORE_PASSWORD_CONFIRM
echo ""

if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD_CONFIRM" ]; then
    echo "❌ Passwords do not match!"
    exit 1
fi

read -sp "Enter key password: " KEY_PASSWORD
echo ""

read -sp "Confirm key password: " KEY_PASSWORD_CONFIRM
echo ""

if [ "$KEY_PASSWORD" != "$KEY_PASSWORD_CONFIRM" ]; then
    echo "❌ Passwords do not match!"
    exit 1
fi

# Prompt for certificate details
echo ""
echo "Enter certificate details:"
read -p "First and Last Name: " CERT_NAME
read -p "Organizational Unit: " CERT_OU
read -p "Organization: " CERT_ORG
read -p "City or Locality: " CERT_CITY
read -p "State or Province: " CERT_STATE
read -p "Country Code (2 letters): " CERT_COUNTRY

# Generate keystore
echo ""
echo "🔨 Generating keystore..."

keytool -genkeypair \
    -v \
    -storetype PKCS12 \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=$CERT_NAME, OU=$CERT_OU, O=$CERT_ORG, L=$CERT_CITY, ST=$CERT_STATE, C=$CERT_COUNTRY"

echo ""
echo "✅ Keystore generated successfully: $KEYSTORE_FILE"
echo ""
echo "📝 Add these environment variables to your build environment:"
echo ""
echo "export MADHAVAI_UPLOAD_STORE_FILE=\$(pwd)/$KEYSTORE_FILE"
echo "export MADHAVAI_UPLOAD_STORE_PASSWORD=$KEYSTORE_PASSWORD"
echo "export MADHAVAI_UPLOAD_KEY_ALIAS=$KEY_ALIAS"
echo "export MADHAVAI_UPLOAD_KEY_PASSWORD=$KEY_PASSWORD"
echo ""
echo "⚠️  SECURITY REMINDERS:"
echo "  1. Store the keystore file securely (use a password manager or secure vault)"
echo "  2. Never commit the keystore to version control"
echo "  3. Keep backups of the keystore in multiple secure locations"
echo "  4. If you lose the keystore, you cannot update your app on Play Store"
echo ""
