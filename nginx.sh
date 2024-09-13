#!/bin/bash

DOMAIN=$1
BACKEND_SERVICE=$2
EMAIL=$3


if ! [ -x "$(command -v certbot)" ]; then
    echo "Certbot not found. Installing Certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

BACKUP_DIR="/etc/nginx/backup"
sudo mkdir -p $BACKUP_DIR
sudo cp /etc/nginx/nginx.conf $BACKUP_DIR/nginx.conf.bak.$(date +%F_%T)

if grep -q "server_name $DOMAIN;" /etc/nginx/nginx.conf; then
    echo "Domain $DOMAIN already exists in nginx configuration"
    exit 1
fi

TMP_CONF=$(mktemp)

cat <<EOL > $TMP_CONF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass $BACKEND_SERVICE;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOL

sudo awk -v file="$TMP_CONF" '
    /http {/ {
        print;
        system("cat " file);
        next;
    }
    { print }' /etc/nginx/nginx.conf >/etc/nginx/nginx.conf.new

sudo mv /etc/nginx/nginx.conf.new /etc/nginx/nginx.conf

rm $TMP_CONF


sudo nginx -t || { echo "Nginx configuration test failed"; exit 1; }

sudo systemctl reload nginx

if sudo certbot --nginx --non-interactive --agree-tos -d $DOMAIN --email $EMAIL; then
    echo "SSL certificate generated and installed successfully for $DOMAIN"
else
    echo "Failed to generate SSL certificate for $DOMAIN"
    exit 1
fi

sudo systemctl reload nginx

echo "Configuration for $DOMAIN added successfully with SSL."

