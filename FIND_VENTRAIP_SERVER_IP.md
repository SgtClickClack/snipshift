# How to Find Your VentraIP Server IP Address

## Method 1: VIP Dashboard (Easiest)

### Step 1: Access Your Dashboard
1. Go to `https://vip.ventraip.com.au/dashboard`
2. Log in with your VentraIP credentials
3. Navigate to **"My Services"** or **"Hosting Services"**

### Step 2: Find Your Hosting Account
1. Look for your `snipshift.com.au` hosting service
2. Click **"Manage"** or **"View Details"**
3. Look for **"Server Information"** section

### Step 3: Locate IP Address
The server IP will be displayed as:
- **Server IP**: `xxx.xxx.xxx.xxx`
- **Shared IP**: `xxx.xxx.xxx.xxx`
- Or in a section called **"Account Details"**

## Method 2: cPanel Server Information

### Step 1: Access cPanel
1. From your VIP dashboard, click **"cPanel"**
2. Or go directly: `https://cpanel.your-server-name.ventraip.com.au`

### Step 2: Find Server Information
1. On the cPanel main page, look for **"General Information"** (right sidebar)
2. Find **"Server Information"** section
3. Look for:
   - **Shared IP Address**: This is what you need
   - **Server Name**: Shows the server hostname

## Method 3: Email from VentraIP

### Check Your Welcome Email
When you signed up for hosting, VentraIP sent a welcome email containing:
- **Server IP Address**
- **cPanel login details**
- **Account information**

Search your email for:
- Subject: "Welcome to VentraIP" or "Hosting Account Created"
- From: VentraIP Australia
- Contains server details and IP address

## Method 4: Contact VentraIP Support

### If you can't find the IP address:
1. **Phone**: `13 24 85` (Australian business hours)
2. **Email**: Create an eTicket in your VIP dashboard
3. **Live Chat**: Available on the VentraIP website

### What to Ask For:
"I need the server IP address for my hosting account for `snipshift.com.au` to configure DNS records."

## Method 5: Command Line Check (Advanced)

### If you have SSH access enabled:
```bash
# Check your current IP from the server
curl ifconfig.me

# Or check server details
hostname -I
```

## Expected IP Address Format

VentraIP typically uses Australian IP ranges:
- `103.x.x.x` (common range)
- `139.x.x.x` (alternative range)
- `202.x.x.x` (older range)

## What This IP Address Is For

You'll use this IP address in your DNS records:
```dns
Type: A
Name: www
Value: [Your VentraIP Server IP]
TTL: 3600
```

## Quick Test

Once you have the IP, you can test it:
```bash
# Ping the server
ping your-server-ip

# Check if web server is running
curl http://your-server-ip
```

## Next Steps After Finding IP

1. **Copy the IP address** (format: xxx.xxx.xxx.xxx)
2. **Configure DNS records** using the IP
3. **Wait for propagation** (2-24 hours)
4. **Deploy your application** to the hosting account

## Common Locations Where IP Address Appears

- VIP Dashboard → My Services → Hosting Account Details
- cPanel → General Information (right sidebar)
- Welcome email subject: "VentraIP Hosting Account"
- Account invoice or billing details
- Server status page in VIP dashboard

Once you find your server IP address, you can replace `[Your VentraIP Server IP]` in all the DNS configuration examples I provided earlier.