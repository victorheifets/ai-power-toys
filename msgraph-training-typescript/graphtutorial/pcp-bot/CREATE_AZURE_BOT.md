# Create Azure Bot Resource

## ✅ You're Correct!

The ID `9db623c8-aad8-4f4a-ac12-8401bc1dc2ec` is your **Application** (App Registration).

But you ALSO need an **Azure Bot** resource to configure the messaging endpoint.

---

## 🔍 Check If You Have The Bot

1. Go to https://portal.azure.com
2. Click "All resources" (left sidebar)
3. Look for Type = "Azure Bot" or "Bot Service"

**If you see one** → Click it, go to Configuration, paste the URL
**If you don't see one** → Follow steps below to create it

---

## 🆕 Create Azure Bot (5 minutes)

### Step 1: Start Creation

1. Go to https://portal.azure.com
2. In the search bar, type: **Azure Bot**
3. Click **"Azure Bot"** (the service)
4. Click **"+ Create"** button

### Step 2: Fill Form - Basics Tab

**Project Details:**
- **Subscription:** `MMCA_DIP_AzureVDI_11` (or your subscription)
- **Resource group:** Select existing or create new (e.g., `pcp-bot-rg`)

**Bot Details:**
- **Bot handle:** `pcp-bot-heifets` (must be globally unique)
- **Pricing tier:** `F0 (Free)`

### Step 3: Fill Form - App Registration Tab

Click "Next: App registration" or scroll down

- **Creation type:** Select **"Use existing app registration"**

- **App ID:** Paste this:
  ```
  9db623c8-aad8-4f4a-ac12-8401bc1dc2ec
  ```

- **App tenant ID:** Paste this:
  ```
  871a6e27-1087-4575-98e0-56e5738bc38e
  ```

### Step 4: Review and Create

1. Click **"Review + create"**
2. Verify the information
3. Click **"Create"**
4. Wait 1-2 minutes for deployment

### Step 5: Go to Resource

1. When deployment completes, click **"Go to resource"**
2. You're now in the Azure Bot resource page!

---

## ⚙️ Configure Messaging Endpoint

Now that you have the Azure Bot resource:

### Step 1: Open Configuration
- On the LEFT sidebar, click **"Configuration"**

### Step 2: Set Messaging Endpoint
- Find field: **"Messaging endpoint"**
- Paste this URL:
  ```
  https://bears-barnes-informative-foster.trycloudflare.com/api/messages
  ```
- Click **"Apply"** at the bottom

### Step 3: Enable Teams Channel
- On the LEFT sidebar, click **"Channels"**
- Click the **Microsoft Teams** icon
- Click **"Save"**

---

## ✅ Done!

Now your bot is fully configured in Azure.

**Next step:** Install in Microsoft Teams

---

## 📝 Summary

You need TWO things in Azure:

1. ✅ **App Registration** (Application)
   - ID: `9db623c8-aad8-4f4a-ac12-8401bc1dc2ec`
   - Already created ✓

2. ✅ **Azure Bot Resource** (Bot Service)
   - Links to the App Registration above
   - This is where you configure the messaging endpoint
   - **Create this if you don't have it** ← You're here

Both work together to make the bot function!

---

## 🆘 If You Can't Create (No Permissions)

If you get a permissions error creating the Azure Bot:

**Option 1:** Ask someone with Azure admin access to create it for you
- Give them this App ID: `9db623c8-aad8-4f4a-ac12-8401bc1dc2ec`
- Tell them to create an Azure Bot (F0 tier) using the existing app registration

**Option 2:** Use Bot Framework Portal (alternative)
- Go to https://dev.botframework.com
- Sign in with the same Azure account
- Click "My bots" → "Create a bot"
- Use the same App ID

---

After creating the Azure Bot, come back and configure the messaging endpoint!
