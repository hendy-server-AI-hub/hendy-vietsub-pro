import os
import zipfile
import shutil

# 1. Create icons folder
icon_dir = os.path.join("public", "chrome-extension", "icons")
os.makedirs(icon_dir, exist_ok=True)

# Copy generated pwa-192x192.png to icon16, icon48, icon128
src_icon = os.path.join("public", "pwa-192x192.png")
if os.path.exists(src_icon):
    shutil.copyfile(src_icon, os.path.join(icon_dir, "icon16.png"))
    shutil.copyfile(src_icon, os.path.join(icon_dir, "icon48.png"))
    shutil.copyfile(src_icon, os.path.join(icon_dir, "icon128.png"))
    print("Copied extension icons successfully.")

# 2. Package into public/hendy-vietsub-chrome-extension.zip
zip_path = os.path.join("public", "hendy-vietsub-chrome-extension.zip")
ext_dir = os.path.join("public", "chrome-extension")

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(ext_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, ext_dir)
            zipf.write(full_path, rel_path)

print(f"Created {zip_path} successfully ({os.path.getsize(zip_path)} bytes).")
