# Deploying Tassel CO$T to Hostinger

Once through the checklist below, every push to `main` on GitHub deploys
automatically via `.github/workflows/deploy.yml`.

The stack on the VPS is Node 20 + PM2 + Nginx + Certbot. No Docker, no
Vercel, no external functions — everything runs on one process behind
Nginx.

---

## 0. What you need before you start

- A Hostinger KVM VPS (minimum KVM 2; KVM 4 gives more headroom for the
  Scorecard row-count and any AI-summary bursts).
- A domain pointed to the VPS's IPv4 address (Cloudflare or the
  registrar's DNS).
- Local SSH access as `root` to the VPS.
- Push access to `github.com/cardinalaiml/college-roi` (already set up
  via `~/.ssh/id_ed25519`).

---

## 1. Bootstrap the VPS (run once, on the server)

SSH in as root and paste these blocks in order. Copy-paste is safer than
re-typing.

```bash
# System + Node 20 + Nginx + Git + PM2
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git ufw certbot python3-certbot-nginx
npm install -g pm2
node --version   # should print v20.x
```

```bash
# Firewall — SSH + HTTP + HTTPS only. Port 3000 stays private.
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 3000/tcp
ufw --force enable
```

```bash
# App directory + clone
mkdir -p /var/www
cd /var/www
git clone https://github.com/cardinalaiml/college-roi.git
cd college-roi
```

```bash
# .env.local — same three lines you have locally. Paste, save with Ctrl+O,
# Enter, then Ctrl+X.
nano .env.local
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...
# ANTHROPIC_API_KEY=...
chmod 600 .env.local
```

```bash
# First build + PM2 start
npm ci
npm run build
pm2 start npm --name "college-roi" -- start
pm2 save
pm2 startup   # copy-paste the command it prints, then run pm2 save again
pm2 status
curl -sS http://localhost:3000 | head -5   # should return HTML
```

```bash
# PM2 log rotation (avoids the log file eating disk)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

---

## 2. Nginx reverse proxy

Replace `yourdomain.com` with your real domain in both spots:

```bash
cat > /etc/nginx/sites-available/college-roi <<'CONF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
CONF

ln -sf /etc/nginx/sites-available/college-roi /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
```

Then hit `http://yourdomain.com` in a browser — you should see the Tassel
CO$T homepage over plain HTTP.

---

## 3. TLS (Let's Encrypt via Certbot)

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com \
  --agree-tos --email you@yourdomain.com --no-eff-email --redirect
```

Certbot rewrites the Nginx config to add a 443 server block and 80→443
redirect. Certificates auto-renew via a systemd timer (`systemctl list-timers | grep certbot`).

---

## 4. Deploy SSH key (so GitHub Actions can push updates)

On your **local** machine (NOT the VPS):

```bash
ssh-keygen -t ed25519 -C "cardinalaiml-deploy" -f ~/.ssh/tasselcost_deploy -N ""
cat ~/.ssh/tasselcost_deploy.pub    # copy the public key
```

On the **VPS**, append the public key to root's authorized keys:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
cat >> ~/.ssh/authorized_keys        # paste the public key, then Ctrl+D
chmod 600 ~/.ssh/authorized_keys
```

Test the deploy key works from your local machine:

```bash
ssh -i ~/.ssh/tasselcost_deploy root@<VPS_IP> "whoami"
# should print: root
```

Then copy the **private** key into a GitHub secret:

```bash
cat ~/.ssh/tasselcost_deploy         # copy the whole output, BEGIN + END lines
```

---

## 5. GitHub repo secrets

`Settings → Secrets and variables → Actions → New repository secret`, add
three:

| Name           | Value                                          |
| -------------- | ---------------------------------------------- |
| `VPS_HOST`     | Your VPS IPv4 (or hostname)                    |
| `VPS_USER`     | `root`                                         |
| `VPS_SSH_KEY`  | The whole `~/.ssh/tasselcost_deploy` (private) |
| `VPS_PORT`     | *(optional)* SSH port if you moved it off 22   |

---

## 6. First deploy

Push any small commit to `main` (or open the Actions tab and re-run the
latest run). The `Deploy to Hostinger` workflow runs two jobs:

1. **gate** — installs deps, `npm run lint`, `tsc --noEmit`,
   `npm run test:roi`. If any step fails, deploy is skipped.
2. **deploy** — SSHes as `${VPS_USER}` into `${VPS_HOST}`, resets
   `/var/www/college-roi` to `origin/main`, runs `npm ci`, `npm run
   build`, `pm2 reload college-roi`, `pm2 save`.

The site should serve the new build within ~90 seconds of a push.

---

## Ongoing operations

| Task                                | Command (on the VPS)                                                        |
| ----------------------------------- | --------------------------------------------------------------------------- |
| Check app status                    | `pm2 status`                                                                |
| Tail app logs                       | `pm2 logs college-roi`                                                      |
| Restart the app manually            | `pm2 reload college-roi`                                                    |
| Rotate an env variable              | `nano /var/www/college-roi/.env.local` then `pm2 reload college-roi`        |
| Reload Nginx after config change    | `nginx -t && systemctl reload nginx`                                        |
| Renew TLS by hand (rarely needed)   | `certbot renew --dry-run` then `certbot renew`                              |
| Roll back to the previous commit    | `cd /var/www/college-roi && git reset --hard HEAD~1 && npm ci && npm run build && pm2 reload college-roi` |
| Re-run the Scorecard load           | `cd /var/www/college-roi && npm run etl:clean && npm run load:clean`        |

---

## Sanity checks after a deploy

```bash
curl -sSI https://yourdomain.com | head -1        # expect: HTTP/2 200
curl -sS  https://yourdomain.com/api/search?q=harvard | head -c 200
curl -sSI https://yourdomain.com/college/166027-harvard-university | head -1
```

If any of these fail, `pm2 logs college-roi --lines 50` on the VPS is the
fastest diagnosis path.
