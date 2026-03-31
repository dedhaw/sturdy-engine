import os
import sys

# Add src to path
# We are currently in the root
sys.path.append(os.path.join(os.getcwd(), "devcode-agent-service", "src"))

from utils.ollama_manager import OllamaManager

def test_ollama_manager():
    # Force base_dir to the correct one (absolute)
    base_dir = os.path.join(os.getcwd(), "devcode-agent-service")
    manager = OllamaManager(base_dir=base_dir)
    print(f"Bin dir: {manager.bin_dir}")
    print(f"Ollama path: {manager.ollama_path}")
    
    is_installed = manager.is_installed()
    print(f"Is installed: {is_installed}")
    
    binary_path = manager.get_binary_path()
    print(f"Binary path: {binary_path}")
    
    if binary_path:
        print(f"Binary exists: {os.path.exists(binary_path)}")

if __name__ == "__main__":
    test_ollama_manager()
