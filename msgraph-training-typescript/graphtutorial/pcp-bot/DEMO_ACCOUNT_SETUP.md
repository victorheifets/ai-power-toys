# Create Demo Account for Bot Demonstration

## ✅ YES - This Works Great for Demos!

You can create a FREE Microsoft 365 developer account, deploy the bot there, and invite people to see it working.

---

## 🆓 Option 1: Microsoft 365 Developer Program (FREE Forever)

### Step 1: Sign Up for Developer Account

1. Go to: https://developer.microsoft.com/en-us/microsoft-365/dev-program
2. Click **"Join now"** (Free)
3. Sign in with personal Microsoft account (or create one)
4. Fill out the form:
   - Country: Your country
   - Company: "Personal Demo" or "Merck POC"
   - Language: English
   - Select: "Building a Microsoft Teams app"
5. Accept terms → **Join**

### Step 2: Get Free Microsoft 365 Subscription

1. After joining, click **"Set up E5 subscription"**
2. Create your sandbox:
   - Admin username: e.g., `admin@pcpbotdemo.onmicrosoft.com`
   - Domain: Choose unique domain like `pcpbotdemo`
   - Password: [Create strong password]
3. Wait 2-3 minutes for setup

**You now have:**
- ✅ FREE Microsoft 365 E5 license (renewable every 90 days)
- ✅ 25 user licenses
- ✅ Full Microsoft Teams access
- ✅ Azure AD tenant
- ✅ No credit card required!

### Step 3: Deploy Bot to Your New Tenant

**A) Create Bot Registration in YOUR new tenant**

```bash
# Login to Azure with your NEW demo account
az logout
az login

# Should show your new tenant (pcpbotdemo.onmicrosoft.com)

# Create new bot registration
# (Follow the same steps as before)
```

**B) Or - Reuse existing bot (EASIER)**

Since your bot is Multi-Tenant, you can use the SAME bot!
- Keep the same App ID: `9db623c8-aad8-4f4a-ac12-8401bc1dc2ec`
- Keep the same credentials
- Just publish app to your NEW Teams tenant

### Step 4: Publish Bot in Your Demo Tenant

1. Login to https://admin.teams.microsoft.com with `admin@pcpbotdemo.onmicrosoft.com`
2. Go to **Teams apps** → **Manage apps**
3. Click **Upload**
4. Upload `pcp-bot.zip`
5. Click **Publish**

Done! You're the admin, so instant approval! ✅

### Step 5: Test It Yourself

1. Login to Teams: https://teams.microsoft.com
2. Use: `admin@pcpbotdemo.onmicrosoft.com`
3. Go to Apps → Find "PCP Bot"
4. Click Add
5. Test all features!

### Step 6: Invite Others to Demo

**Create demo users:**

1. Go to https://admin.microsoft.com
2. Users → Active users → Add user
3. Create users like:
   - `demo1@pcpbotdemo.onmicrosoft.com`
   - `demo2@pcpbotdemo.onmicrosoft.com`
4. Assign Teams license

**Invite people to join:**

Method A: Give them guest access
- Teams admin center → Users → Guest access → Enable
- Invite external emails as guests
- They can join Teams and test bot

Method B: Give them demo credentials
- Share one of your demo user accounts
- They login and test
- **Note:** For demo only, not production!

---

## 🆓 Option 2: Free Azure Account (Alternative)

If you want Azure resources too:

1. Go to: https://azure.microsoft.com/free/
2. Sign up with credit card (won't be charged)
3. Get $200 credit for 30 days
4. Keep free tier services after credit expires

**But Option 1 is better** because:
- No credit card needed
- Renewable every 90 days
- Includes Teams out of the box

---

## 🎯 Best Strategy for Your Use Case

### For Demonstration to Stakeholders:

**Step 1: Setup (30 minutes)**
```
1. Create M365 Developer account (free)
2. Get your sandbox tenant
3. Upload pcp-bot.zip as admin
4. Create 2-3 demo users
```

**Step 2: Demo Prep (15 minutes)**
```
1. Login as each demo user
2. Install PCP Bot
3. Run through standup, EOD, /create-us
4. Take screenshots/record video
```

**Step 3: Live Demo or Share Access**
```
Option A: Screen share your demo
Option B: Give stakeholders guest access
Option C: Share demo credentials temporarily
```

**Step 4: Show Value**
```
"This is working in my demo tenant.
 Once approved, same bot works in Merck tenant
 with real ADO integration and our users."
```

---

## ⚠️ Limitations of Demo Account

**What WON'T work:**
- ❌ Can't access Merck ADO (different tenant)
- ❌ Can't see Merck user data
- ❌ Can't integrate with Merck systems

**What WILL work:**
- ✅ All bot commands
- ✅ AI story creation (OpenAI still works)
- ✅ All UI/UX features
- ✅ Adaptive cards
- ✅ Full Teams integration
- ✅ Multi-user testing

**Solution for ADO:**
- Use a public ADO organization (create free one at dev.azure.com)
- Or mock the ADO responses for demo
- Or show ADO integration in Merck environment separately

---

## 🚀 Quick Start Commands

### Create Demo Tenant & Deploy Bot

```bash
# 1. Get M365 Developer account
# Visit: https://developer.microsoft.com/en-us/microsoft-365/dev-program

# 2. Once you have your tenant, publish bot
# Login to Teams admin: https://admin.teams.microsoft.com
# Upload: teams-app/pcp-bot.zip

# 3. Test in Teams
# Login: https://teams.microsoft.com
# Apps → PCP Bot → Add
```

### Make Cloudflare URL Accessible

Your bot is already running! Just need to:
1. Keep your Mac running with bot + tunnel
2. The same Cloudflare URL works for demo tenant
3. Update bot endpoint in demo tenant (same as before)

---

## 💡 Recommended Approach

**For Maximum Impact:**

1. **Week 1: Create Demo**
   - Set up M365 dev account
   - Deploy bot there
   - Record demo video
   - Create 2-3 test users
   - Run through all features

2. **Week 1-2: Share Demo**
   - Email stakeholders with video
   - Or give them guest access to try it
   - Gather feedback

3. **Week 2: Request Production**
   - Show working demo
   - Use `ADMIN_REQUEST_EMAIL.md`
   - Request Merck Teams admin to publish
   - Reference the working demo as proof

4. **Week 3+: Production Deployment**
   - Once approved in Merck tenant
   - Same bot, now with real ADO integration
   - Roll out to team

---

## 📧 Demo Invitation Template

```
Subject: PCP Bot Demo - Teams Collaboration Tool

Hi [Stakeholder],

I've built a Microsoft Teams bot for our team and set up a demo environment
where you can try it out.

DEMO ACCESS:
- Teams URL: https://teams.microsoft.com
- Demo Account: demo1@pcpbotdemo.onmicrosoft.com
- Password: [provided separately]

WHAT TO TRY:
1. Find "PCP Bot" in Teams Apps
2. Type: help
3. Try: standup
4. Try: /create-us

This bot will help us with:
- Daily standup automation
- EOD check-ins
- ADO integration
- AI-assisted story creation

Let me know what you think!

[Your name]
```

---

## ✅ Summary

**Yes, creating a demo account is a GREAT strategy!**

**Pros:**
- ✅ You control everything (you're admin)
- ✅ No approval process
- ✅ Perfect for demos/POC
- ✅ Free forever (renewable)
- ✅ Can invite guests to try it
- ✅ Proves the concept works

**Cons:**
- ⚠️ Separate from Merck (can't use real ADO/users)
- ⚠️ Need to maintain separately

**Best Use:**
- Demo to stakeholders → Get buy-in → Request Merck deployment

**Want me to help you set this up?** I can guide you through each step.
