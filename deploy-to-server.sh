#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_error() {
    echo -e "${RED}[!]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[*]${NC} $1"
}

# Check if server address is provided
if [ $# -eq 0 ]; then
    print_error "Usage: $0 <server-address> [user]"
    print_error "Example: $0 iptv.yourdomain.com"
    print_error "Example: $0 iptv.yourdomain.com ubuntu"
    exit 1
fi

SERVER=$1
USER=${2:-root}
REMOTE_DIR="/opt/iptv-addon"

print_status "Deploying to $USER@$SERVER:$REMOTE_DIR"

# Create deployment package
print_status "Creating deployment package..."
DEPLOY_DIR=$(mktemp -d)
DEPLOY_FILES=(
    "addon.js"
    "index.js"
    "server.js"
    "test-streams.js"
    "setup-env.js"
    "package.json"
    "package-lock.json"
    "README.md"
    ".env"
    "static"
)

# Copy files to temp directory
for file in "${DEPLOY_FILES[@]}"; do
    if [ -e "$file" ]; then
        cp -r "$file" "$DEPLOY_DIR/"
        print_status "Added $file"
    else
        print_warning "Skipping $file (not found)"
    fi
done

# Create a setup script for the server
cat > "$DEPLOY_DIR/server-setup.sh" <<'EOF'
#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Setting up IPTV addon...${NC}"

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Check for .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    node setup-env.js
    echo -e "${YELLOW}Please edit .env and add your M3U_URL${NC}"
fi

# Set permissions
sudo chown -R root:root /opt/iptv-addon

echo -e "${GREEN}Setup complete!${NC}"
echo "To start the service:"
echo "  sudo systemctl start iptv-addon"
echo "  sudo systemctl enable iptv-addon"
echo ""
echo "To check logs:"
echo "  sudo journalctl -u iptv-addon -f"
EOF

chmod +x "$DEPLOY_DIR/server-setup.sh"

# Create tarball
print_status "Creating tarball..."
cd "$DEPLOY_DIR"
tar -czf iptv-addon.tar.gz *
cd - > /dev/null

# Copy to server
print_status "Copying files to server..."
scp "$DEPLOY_DIR/iptv-addon.tar.gz" "$USER@$SERVER:/tmp/"

if [ $? -ne 0 ]; then
    print_error "Failed to copy files to server!"
    rm -rf "$DEPLOY_DIR"
    exit 1
fi

# Extract and setup on server
print_status "Setting up on server..."
ssh "$USER@$SERVER" << 'ENDSSH'
# Create directory
sudo mkdir -p /opt/iptv-addon
cd /opt/iptv-addon

# Extract files
sudo tar -xzf /tmp/iptv-addon.tar.gz

# Run setup
sudo bash server-setup.sh

# Clean up
rm /tmp/iptv-addon.tar.gz
ENDSSH

# Clean up local temp files
rm -rf "$DEPLOY_DIR"

print_status "Deployment complete!"
print_status "======================================"
print_status "Next steps on the server:"
print_status "1. Edit /opt/iptv-addon/.env with your M3U_URL"
print_status "2. Start the service: sudo systemctl start iptv-addon"
print_status "3. Enable auto-start: sudo systemctl enable iptv-addon"
print_status ""
print_status "Check status: sudo systemctl status iptv-addon"
print_status "View logs: sudo journalctl -u iptv-addon -f"
print_status "======================================" 