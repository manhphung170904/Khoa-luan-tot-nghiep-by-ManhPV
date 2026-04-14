import os

def search_suntower(root_dir):
    results = []
    for root, dirs, files in os.walk(root_dir):
        if 'target' in dirs:
            dirs.remove('target')
        for file in files:
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    if 'suntower' in content.lower():
                        results.append(path)
            except Exception:
                pass
    return results

if __name__ == "__main__":
    found = search_suntower('d:\\Documents\\1.1.KLTN_PLAYWRIGHT\\moonNest-main\\src')
    if found:
        print("Found in:")
        for p in found:
            print(p)
    else:
        print("Not found in src")
