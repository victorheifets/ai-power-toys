#!/bin/bash
# Script to clear Azure authentication cache

echo "Clearing Azure authentication cache..."

# Clear common Azure Identity cache locations
rm -rf ~/.IdentityService 2>/dev/null && echo "✓ Removed .IdentityService" || echo "  .IdentityService not found"
rm -rf ~/.msal_token_cache.bin 2>/dev/null && echo "✓ Removed .msal_token_cache.bin" || echo "  .msal_token_cache.bin not found"
rm -rf ~/.azure 2>/dev/null && echo "✓ Removed .azure" || echo "  .azure not found"

# Check for any MSAL cache files
if [ -d "$HOME/.msal" ]; then
    rm -rf "$HOME/.msal" && echo "✓ Removed .msal directory"
fi

echo ""
echo "Cache cleanup complete!"
echo ""
echo "Now run: npx ts-node index.ts"
echo ""
