import os
from PIL import Image, ImageEnhance

# Config
INPUT_DIR = "assets"
OUTPUT_DIR = "processed_images"
LOGO_PATH = "logo.png"

def add_watermark():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # Load Logo
    if not os.path.exists(LOGO_PATH):
        print("Error: logo.png not found!")
        return
    
    logo = Image.open(LOGO_PATH).convert("RGBA")
    
    # Process each gender folder
    for gender in ['male', 'female']:
        in_path = os.path.join(INPUT_DIR, gender)
        out_path = os.path.join(OUTPUT_DIR, gender)
        
        if not os.path.exists(out_path):
            os.makedirs(out_path)
            
        if not os.path.exists(in_path):
            continue

        for filename in os.listdir(in_path):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                print(f"Processing: {gender}/{filename}")
                
                # Open Image
                img = Image.open(os.path.join(in_path, filename)).convert("RGBA")
                
                # Resize Logo (20% of image width)
                w_percent = (img.width * 0.2) / float(logo.size[0])
                h_size = int((float(logo.size[1]) * float(w_percent)))
                logo_resized = logo.resize((int(img.width * 0.2), h_size), Image.Resampling.LANCZOS)
                
                # Set Opacity 30%
                alpha = logo_resized.split()[3]
                alpha = ImageEnhance.Brightness(alpha).enhance(0.3)
                logo_resized.putalpha(alpha)
                
                # Paste at Bottom Right
                position = (img.width - logo_resized.width - 20, img.height - logo_resized.height - 20)
                img.paste(logo_resized, position, logo_resized)
                
                # Save
                img.convert("RGB").save(os.path.join(out_path, filename), quality=95)

if __name__ == "__main__":
    add_watermark()
    print("All Done! Images ready in /processed_images")