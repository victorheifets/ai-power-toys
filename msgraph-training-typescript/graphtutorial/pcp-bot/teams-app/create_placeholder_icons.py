#!/usr/bin/env python3
"""
Create placeholder icons for Teams app package.
This script creates simple colored placeholder icons for testing.
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    print("✅ PIL/Pillow is installed")
except ImportError:
    print("❌ PIL/Pillow not installed. Installing...")
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont
    print("✅ PIL/Pillow installed successfully")

def create_color_icon():
    """Create 192x192px color icon"""
    # Create image with Microsoft Teams blue background
    img = Image.new('RGB', (192, 192), color='#0078D4')
    draw = ImageDraw.Draw(img)

    # Draw a simple robot/bot icon (circle head + rectangle body)
    # Head (circle)
    draw.ellipse([66, 40, 126, 100], fill='#FFFFFF', outline='#000000', width=2)

    # Eyes
    draw.ellipse([80, 60, 90, 70], fill='#000000')
    draw.ellipse([102, 60, 112, 70], fill='#000000')

    # Smile
    draw.arc([76, 70, 116, 90], start=0, end=180, fill='#000000', width=2)

    # Body (rectangle)
    draw.rectangle([76, 100, 116, 140], fill='#FFFFFF', outline='#000000', width=2)

    # Antennae
    draw.line([96, 40, 96, 30], fill='#FFFFFF', width=2)
    draw.ellipse([93, 26, 99, 32], fill='#FFD700')

    # Add text "PCP"
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
    except:
        font = ImageFont.load_default()

    # Draw text
    text_bbox = draw.textbbox((0, 0), "PCP", font=font)
    text_width = text_bbox[2] - text_bbox[0]
    text_x = (192 - text_width) // 2
    draw.text((text_x, 150), "PCP", fill='#FFFFFF', font=font)

    img.save('color.png')
    print("✅ Created color.png (192x192px)")

def create_outline_icon():
    """Create 32x32px outline icon"""
    # Create transparent background
    img = Image.new('RGBA', (32, 32), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw simple white robot outline
    # Head
    draw.ellipse([11, 6, 21, 16], outline='#FFFFFF', width=1)

    # Eyes
    draw.point([(14, 10), (18, 10)], fill='#FFFFFF')

    # Body
    draw.rectangle([12, 16, 20, 24], outline='#FFFFFF', width=1)

    # Antennae
    draw.line([16, 6, 16, 3], fill='#FFFFFF', width=1)
    draw.point([(16, 2)], fill='#FFFFFF')

    img.save('outline.png')
    print("✅ Created outline.png (32x32px)")

if __name__ == '__main__':
    import os

    # Change to the directory where this script is located
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    print("🎨 Creating placeholder icons for Teams app...")
    print()

    create_color_icon()
    create_outline_icon()

    print()
    print("✅ Icons created successfully!")
    print()
    print("📝 Next steps:")
    print("1. Update manifest.json with your Bot App ID")
    print("2. Run: zip -r pcp-bot.zip manifest.json color.png outline.png")
    print("3. Upload pcp-bot.zip to Microsoft Teams")
