import os
import re

def search_codebase(query, base_path):
    """
    Searches the codebase for a given query (function name, class, or symbol).
    Returns a list of matching files and lines.
    """
    if not base_path or not os.path.exists(base_path):
        return []

    results = []
    # Common extensions to search
    valid_extensions = ('.py', '.js', '.ts', '.tsx', '.jsx', '.java', '.go', '.rs', '.cpp', '.h', '.c', '.cs')
    
    # Folders to ignore
    ignore_dirs = {'.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build', '.gemini'}

    for root, dirs, files in os.walk(base_path):
        # In-place modification of dirs to skip ignored ones
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for file in files:
            if file.endswith(valid_extensions):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_path)
                
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                        for i, line in enumerate(f):
                            # Case-insensitive search for the symbol
                            if query.lower() in line.lower():
                                results.append({
                                    "file": rel_path,
                                    "line": i + 1,
                                    "snippet": line.strip()
                                })
                except Exception:
                    continue
                    
    # Limit results to avoid context bloat
    return results[:20]

def format_search_results(results):
    if not results:
        return "No matches found."
    
    output = "Code Search Results:\n"
    for res in results:
        output += f"- {res['file']}:{res['line']}: {res['snippet']}\n"
    return output
