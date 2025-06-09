#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[*]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root"
    exit 1
fi

# Get domain name from user
read -p "Enter your domain (e.g., iptv.yourdomain.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    print_error "Domain name is required"
    exit 1
fi

# Get email for Let's Encrypt
read -p "Enter your email for Let's Encrypt notifications: " EMAIL
if [ -z "$EMAIL" ]; then
    print_error "Email is required for Let's Encrypt"
    exit 1
fi

# Get DNS provider
print_status "Select your DNS provider for DNS challenges:"
echo "1) Cloudflare"
echo "2) Route53 (AWS)"
echo "3) DigitalOcean"
echo "4) Google Cloud DNS"
echo "5) Other (manual)"
read -p "Enter choice (1-5): " DNS_CHOICE

# Update system
print_status "Updating system packages..."
apt-get update

# Install required packages
print_status "Installing nginx-full and dependencies..."
apt-get install -y nginx-full python3 python3-pip python3-venv git

# Install certbot and DNS plugins
print_status "Installing certbot..."
apt-get install -y certbot

# Install DNS plugin based on choice
case $DNS_CHOICE in
    1)
        print_status "Installing Cloudflare DNS plugin..."
        apt-get install -y python3-certbot-dns-cloudflare
        DNS_PLUGIN="dns-cloudflare"
        
        # Create Cloudflare credentials file
        read -p "Enter your Cloudflare API token: " CF_TOKEN
        mkdir -p /root/.secrets
        cat > /root/.secrets/cloudflare.ini <<EOF
# Cloudflare API token
dns_cloudflare_api_token = $CF_TOKEN
EOF
        chmod 600 /root/.secrets/cloudflare.ini
        CREDENTIALS_PATH="/root/.secrets/cloudflare.ini"
        ;;
    2)
        print_status "Installing Route53 DNS plugin..."
        apt-get install -y python3-certbot-dns-route53
        DNS_PLUGIN="dns-route53"
        print_warning "Make sure your AWS credentials are configured in ~/.aws/credentials"
        CREDENTIALS_PATH=""
        ;;
    3)
        print_status "Installing DigitalOcean DNS plugin..."
        pip3 install certbot-dns-digitalocean
        DNS_PLUGIN="dns-digitalocean"
        
        # Create DigitalOcean credentials file
        read -p "Enter your DigitalOcean API token: " DO_TOKEN
        mkdir -p /root/.secrets
        cat > /root/.secrets/digitalocean.ini <<EOF
# DigitalOcean API token
dns_digitalocean_token = $DO_TOKEN
EOF
        chmod 600 /root/.secrets/digitalocean.ini
        CREDENTIALS_PATH="/root/.secrets/digitalocean.ini"
        ;;
    4)
        print_status "Installing Google Cloud DNS plugin..."
        pip3 install certbot-dns-google
        DNS_PLUGIN="dns-google"
        print_warning "Place your Google Cloud service account JSON key at /root/.secrets/google.json"
        CREDENTIALS_PATH="/root/.secrets/google.json"
        ;;
    *)
        print_warning "Manual DNS mode selected. You'll need to manually create TXT records."
        DNS_PLUGIN="manual"
        CREDENTIALS_PATH=""
        ;;
esac

# Stop nginx temporarily for certificate generation
print_status "Stopping nginx temporarily..."
systemctl stop nginx

# Generate SSL certificate using DNS challenge
print_status "Generating SSL certificate for $DOMAIN..."
if [ "$DNS_PLUGIN" = "manual" ]; then
    certbot certonly \
        --manual \
        --preferred-challenges dns \
        -d "$DOMAIN" \
        -m "$EMAIL" \
        --agree-tos \
        --no-eff-email
else
    if [ -n "$CREDENTIALS_PATH" ]; then
        certbot certonly \
            --$DNS_PLUGIN \
            --${DNS_PLUGIN}-credentials "$CREDENTIALS_PATH" \
            -d "$DOMAIN" \
            -m "$EMAIL" \
            --agree-tos \
            --no-eff-email
    else
        certbot certonly \
            --$DNS_PLUGIN \
            -d "$DOMAIN" \
            -m "$EMAIL" \
            --agree-tos \
            --no-eff-email
    fi
fi

# Check if certificate was generated successfully
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_error "Certificate generation failed!"
    exit 1
fi

print_status "Certificate generated successfully!"

# Create nginx configuration
print_status "Creating nginx configuration..."

# Create the main configuration
cat > /etc/nginx/sites-available/iptv-proxy <<'EOF'
# WebSocket connection upgrade map
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # CORS Headers for Stremio
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;
    
    # Proxy to Stremio addon
    location / {
        proxy_pass http://localhost:3649;
        
        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
        
        # Handle OPTIONS requests for CORS
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "*" always;
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
            add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
    
    # Let's Encrypt challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER;
    
    return 301 https://$server_name$request_uri;
}

# Alternative SSL port configuration (optional)
server {
    listen 3031 ssl http2;
    listen [::]:3031 ssl http2;
    server_name DOMAIN_PLACEHOLDER;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_PLACEHOLDER/privkey.pem;
    
    # Use same SSL settings as main server
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # CORS Headers
    add_header Access-Control-Allow-Origin "*" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept" always;
    
    # Proxy settings (same as main server)
    location / {
        proxy_pass http://localhost:3649;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_set_header X-Forwarded-Port $server_port;
        
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF

# Replace domain placeholder with actual domain
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/iptv-proxy

# Enable the site
print_status "Enabling nginx site..."
ln -sf /etc/nginx/sites-available/iptv-proxy /etc/nginx/sites-enabled/

# Test nginx configuration
print_status "Testing nginx configuration..."
nginx -t

if [ $? -ne 0 ]; then
    print_error "Nginx configuration test failed!"
    exit 1
fi

# Start nginx
print_status "Starting nginx..."
systemctl start nginx
systemctl enable nginx

# Set up automatic certificate renewal
print_status "Setting up automatic certificate renewal..."
cat > /etc/cron.d/certbot-renewal <<EOF
# Renew certificates twice daily
0 */12 * * * root certbot renew --quiet --post-hook "systemctl reload nginx"
EOF

# Create systemd service for the addon
print_status "Creating systemd service for the addon..."
cat > /etc/systemd/system/iptv-addon.service <<EOF
[Unit]
Description=IPTV M3U Stremio Addon
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/iptv-addon
ExecStart=/usr/bin/node /opt/iptv-addon/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3649

[Install]
WantedBy=multi-user.target
EOF

# Create addon directory
print_status "Creating addon directory..."
mkdir -p /opt/iptv-addon

print_status "Setup complete!"
print_status "======================================"
print_status "Your IPTV addon is configured!"
print_status ""
print_status "Domain: https://$DOMAIN"
print_status "Alternative port: https://$DOMAIN:3031"
print_status ""
print_status "Next steps:"
print_status "1. Copy your addon files to /opt/iptv-addon/"
print_status "2. Run: cd /opt/iptv-addon && npm install"
print_status "3. Create .env file with your M3U_URL"
print_status "4. Start the service: systemctl start iptv-addon"
print_status "5. Enable auto-start: systemctl enable iptv-addon"
print_status ""
print_status "Your addon will be available at:"
print_status "https://$DOMAIN/manifest.json"
print_status "======================================"

# Check service status
print_warning "Checking nginx status..."
systemctl status nginx --no-pager

print_status "Installation complete!" 