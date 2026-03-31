import os

def read_files_for_context(files_to_read, base_path):
    context_blob = ""
    for file_rel_path in files_to_read:
        full_path = os.path.abspath(os.path.join(base_path, file_rel_path))
        if not full_path.startswith(os.path.abspath(base_path)):
            continue

        try:
            if os.path.isfile(full_path):
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if len(content) > 10000:
                        content = content[:10000] + "\n...(truncated)"
                    context_blob += f"\n--- FILE: {file_rel_path} ---\n{content}\n--------------------\n"
        except Exception as e:
            context_blob += f"\nError reading {file_rel_path}: {str(e)}\n"
            
    return context_blob
