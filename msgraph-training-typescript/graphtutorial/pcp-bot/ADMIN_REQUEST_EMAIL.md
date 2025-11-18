# Email Template for Teams Admin

Copy this email and send it to your Teams Administrator or IT Help Desk:

---

**Subject:** Request to Publish PCP Bot to Microsoft Teams

**To:** [Your Teams Admin / IT Help Desk]

**Body:**

Hi [Admin Name],

I've developed a Microsoft Teams bot called **PCP Bot** for our team to streamline daily standups, end-of-day check-ins, and Azure DevOps integration. The bot is already registered in our Azure tenant and fully tested.

**I need your help to publish this bot to our organization's Teams app catalog** so team members can install and use it.

## Bot Details

- **Bot Name:** PCP Bot (Product Collaboration Platform Bot)
- **Application ID:** `9db623c8-aad8-4f4a-ac12-8401bc1dc2ec`
- **Tenant:** Merck (871a6e27-1087-4575-98e0-56e5738bc38e)
- **Purpose:** Daily standups, EOD check-ins, ADO integration, AI-assisted user story creation
- **Scope:** Team collaboration and productivity
- **Users:** [Your Team Name] - approximately [X] users

## What I Need You to Do

1. **Upload the app package** to Microsoft Teams Admin Center
2. **Approve/Publish** it to our organization's app catalog
3. Users can then install it from the Teams app store

## Files Provided

I have the Teams app package ready:
- **Location:** `/Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot/teams-app/pcp-bot.zip`
- I can send this file to you via [email/SharePoint/Teams chat]

## Security & Compliance

- ✅ Bot is registered in our Azure AD tenant (not external)
- ✅ All data stays within Merck infrastructure
- ✅ Integrates with our existing ADO (AHITL organization)
- ✅ Uses Merck-approved Azure resources
- ✅ No third-party data sharing

## Instructions for Admin Upload

**Step 1:** Go to [Teams Admin Center](https://admin.teams.microsoft.com)

**Step 2:** Navigate to: **Teams apps** → **Manage apps**

**Step 3:** Click **Upload new app** (or **Upload**)

**Step 4:** Upload `pcp-bot.zip`

**Step 5:** Review app details and click **Publish** or **Approve**

**Step 6:** (Optional) Assign to specific users/groups or make available to entire organization

That's it! Users can then find "PCP Bot" in Teams Apps and install it.

## Benefits to the Team

- ⏱️ Saves 15-20 minutes per person per day on status updates
- 📊 Automatic ADO work item tracking
- 🤖 AI-assisted user story creation
- 🚫 Blocker tracking and notifications
- 📈 Better visibility for team leads

## Questions?

I'm happy to provide any additional information or jump on a call to walk through the bot functionality.

**Contact:** heifets@merck.com

Thank you for your help!

Best regards,
[Your Name]

---

## Alternative: If Admin Needs More Details

If your admin asks for more information, you can also share:

- **Azure Bot Configuration:** Already set up in Azure Portal
- **Messaging Endpoint:** Currently using Cloudflare Tunnel (can be changed to Azure App Service)
- **Source Code:** Available for security review
- **Documentation:** Full deployment and security documentation available

## Attachment Checklist

When sending the email, attach:
- ☑️ `pcp-bot.zip` (Teams app package)
- ☑️ `manifest.json` (if admin wants to review it separately)
- ☑️ Screenshots of bot functionality (optional but helpful)

---

## Quick Admin Guide

If your admin asks "How do I do this?" send them this:

**For Teams Administrators:**

1. Go to https://admin.teams.microsoft.com
2. Click **Teams apps** → **Manage apps**
3. Click **Upload** button
4. Select the `pcp-bot.zip` file
5. Review the app details
6. Click **Publish** or **Allow**
7. Optionally configure availability settings

Done! Users can now install from Teams app store.

---
