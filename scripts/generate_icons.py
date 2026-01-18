import os
from PIL import Image

# Configuration
SOURCE_IMAGE = "/home/rifai/.gemini/antigravity/brain/b916059b-db28-4f59-bdd5-ba25f0b8376a/transparent_logo_1768751464982.png"
TARGET_DIR = "/home/rifai/korjo_tirto/web/public/icons"
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def generate_icons():
    if not os.path.exists(SOURCE_IMAGE):
        print(f"Error: Source image not found at {SOURCE_IMAGE}")
        return

    if not os.path.exists(TARGET_DIR):
        print(f"Creating target directory: {TARGET_DIR}")
        os.makedirs(TARGET_DIR, exist_ok=True)

    try:
        img = Image.open(SOURCE_IMAGE)
        print(f"Opened source image: {SOURCE_IMAGE}")

        for size in SIZES:
            # Resize using LANCZOS for high quality downsampling
            # Fallback for older Pillow versions
            resample_method = getattr(Image, 'Resampling', Image).LANCZOS
            resized_img = img.resize((size, size), resample_method)
            
            filename = f"icon-{size}x{size}.png"
            target_path = os.path.join(TARGET_DIR, filename)
            
            resized_img.save(target_path, "PNG")
            print(f"Generated {filename}")

        print("All icons generated successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    generate_icons()
