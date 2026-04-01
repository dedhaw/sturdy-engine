import os
import subprocess
import shutil
import time
import signal

class OllamaManager:
    def __init__(self):
        self.process = None

    def is_installed(self):
        return shutil.which("ollama") is not None

    def start_server(self):
        # Check if already running on 11434
        try:
            import socket
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                if s.connect_ex(('127.0.0.1', 11434)) == 0:
                    return True
        except Exception:
            pass

        if not self.is_installed():
            print("Ollama command not found. Please install it from ollama.com")
            return False

        print("Starting Ollama server (ollama serve)...")
        try:
            # Run 'ollama serve' directly
            self.process = subprocess.Popen(
                ["ollama", "serve"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid if hasattr(os, 'setsid') else None
            )
            # Give it a few seconds to start
            time.sleep(2)
            return True
        except Exception as e:
            print(f"Error starting Ollama: {e}")
            return False

    def stop_server(self):
        if self.process:
            print("Stopping Ollama server...")
            try:
                if hasattr(os, 'killpg'):
                    os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                else:
                    self.process.terminate()
            except Exception:
                pass
            self.process = None
