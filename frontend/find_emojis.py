import os
import re

emoji_pattern = re.compile(
    "["
    "\U0001f000-\U0001fa6f"
    "\U00002600-\U000027bf"
    "]+", flags=re.UNICODE)

found_files = []
# Assuming the script runs in the frontend directory
search_dir = './src'
for root, _, files in os.walk(search_dir):
    for f in files:
        if f.endswith(('.js', '.jsx', '.ts', '.tsx')):
            filepath = os.path.join(root, f)
            try:
                with open(filepath, 'r', encoding='utf-8') as file:
                    content = file.read()
                    if emoji_pattern.search(content):
                        found_files.append(filepath)
            except Exception as e:
                pass

for f in found_files:
    print(f)
