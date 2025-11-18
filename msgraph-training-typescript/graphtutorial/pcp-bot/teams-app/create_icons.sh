#!/bin/bash
# Create simple placeholder icons using base64 encoded PNG data

# Create a simple blue 192x192 color icon
echo "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABNmlDQ1BQaG90b3Nob3AgSUNDIHByb2ZpbGUAAHjarY6xSsNQFEDPi6LiUCsEcXB4kygotupgxqQtRRCs1SHJ1qShSmkSXl7VfoSjWwcXd7/AyVFwUPwC/0Bx6uAQIYODCJ7p3MPlcsGo2HWnYZRhEGvVbjrS9Xw5+8QMUwDQCbPUbrUOAOIkjvjB5ykR1XQm2bOC2ykcCDWDBAbDIOCkWXrkPUwIDAAAoKTB2YAJZC5UM1ggYgAAAGC8w" | base64 -d > color.png 2>/dev/null || echo "Using fallback method"

# If base64 fails, create a basic file
if [ ! -f color.png ] || [ ! -s color.png ]; then
    # Create a basic 1x1 blue pixel and we'll note it needs replacement
    printf '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a' > color.png
    echo "Created placeholder color.png - replace with actual 192x192 icon"
fi

# Create outline icon (similar approach)
if [ ! -f outline.png ] || [ ! -s outline.png ]; then
    printf '\x89\x50\x4e\x47\x0d\x0a\x1a\x0a' > outline.png
    echo "Created placeholder outline.png - replace with actual 32x32 icon"
fi

echo "Icon placeholders created. You should replace these with proper icons:"
echo "  - color.png should be 192x192px"
echo "  - outline.png should be 32x32px"
echo ""
echo "For now, you can use icons from: https://aka.ms/teams-design-toolkit"
