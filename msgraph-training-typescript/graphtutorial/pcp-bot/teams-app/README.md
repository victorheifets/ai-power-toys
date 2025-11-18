# Teams App Package

This directory contains the Teams app manifest and icons for PCP Bot.

## Files Required

1. **manifest.json** - Teams app manifest (✅ Already created)
2. **color.png** - 192x192px full color icon
3. **outline.png** - 32x32px white outline on transparent background

## Creating Icons

### Option 1: Use Online Tools (Easiest)

1. Go to https://www.canva.com or https://www.figma.com
2. Create a 192x192px design for `color.png`:
   - Use your team colors
   - Add a bot/robot icon or your logo
   - Export as PNG

3. Create a 32x32px design for `outline.png`:
   - White icon on transparent background
   - Simple, recognizable shape
   - Export as PNG

### Option 2: Use Placeholder Icons (For Testing)

For quick testing, you can use simple colored squares:

```bash
# On macOS with ImageMagick (install: brew install imagemagick)
convert -size 192x192 xc:#0078D4 color.png
convert -size 32x32 xc:#FFFFFF outline.png
```

### Option 3: Use Microsoft Teams Design Toolkit

Download icons from: https://aka.ms/teams-design-toolkit

## Before Packaging

1. Update `manifest.json` with your Bot App ID:

```bash
# Replace YOUR_BOT_APP_ID_HERE with your actual App ID (from Azure Portal)
sed -i '' 's/YOUR_BOT_APP_ID_HERE/YOUR_ACTUAL_APP_ID/g' manifest.json
```

2. Verify the App ID appears in 3 places:
   - `id` field
   - `bots[0].botId` field
   - `webApplicationInfo.id` field

## Creating the Package

Once you have all three files:

```bash
cd /Users/heifets/Desktop/MSD/PRIVATE/new_dev/GraphAPI/msgraph-training-typescript/graphtutorial/pcp-bot/teams-app
zip -r pcp-bot.zip manifest.json color.png outline.png
```

## Installing in Teams

1. Open Microsoft Teams
2. Click **Apps** (left sidebar)
3. Click **Manage your apps**
4. Click **Upload an app** → **Upload a custom app**
5. Select `pcp-bot.zip`
6. Click **Add**

## Troubleshooting

### "Unable to install app"

- Verify all 3 files are in the ZIP
- Check manifest.json is valid JSON
- Ensure App ID is correct
- Check icon files are correct dimensions

### "App ID mismatch"

- Make sure App ID in manifest.json matches the one in Azure Portal
- Check all 3 places in manifest.json have the same ID

### Icons don't show properly

- Verify color.png is 192x192px
- Verify outline.png is 32x32px
- Check file names are exact: `color.png` and `outline.png`
- Ensure PNG format, not JPEG

## Teams App Store Submission (Optional)

To publish to your organization's Teams app store:

1. Ensure icons meet Microsoft guidelines
2. Test thoroughly with multiple users
3. Submit to Teams Admin Center
4. Wait for approval from Teams admin

For details: https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-publish-overview
