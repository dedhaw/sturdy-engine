import os
import subprocess
import httpx
import platform
import zipfile
import tarfile
import io
import shutil
import time
import signal
import traceback

class OllamaManager:
    def __init__(self, base_dir=None):
        if base_dir is None:
            # Default to the parent of src (the devcode-agent-service root)
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        self.bin_dir = os.path.join(base_dir, "bin")
        self.ollama_path = os.path.join(self.bin_dir, "ollama")
        self.process = None

    def is_installed(self):
        # Check if ollama is in PATH or in our local bin
        binary_path = self.get_binary_path()
        return binary_path is not None and os.path.exists(binary_path)

    def get_binary_path(self):
        # 1. Check system PATH
        system_path = shutil.which("ollama")
        if system_path:
            return system_path
        
        # 2. Check local binary
        if os.path.exists(self.ollama_path):
            return self.ollama_path
            
        # 3. Check macOS App binary
        macos_app_binary = os.path.join(self.bin_dir, "Ollama.app/Contents/MacOS/Ollama")
        if os.path.exists(macos_app_binary):
            return macos_app_binary
            
        return None

    async def download(self):
        if not os.path.exists(self.bin_dir):
            os.makedirs(self.bin_dir)

        system = platform.system().lower()
        machine = platform.machine().lower()
        
        print(f"Detecting system: {system} {machine}")
        
        url = ""
        
        if system == "darwin":
            # Direct link to the latest macos zip containing the App
            url = "https://ollama.com/download/ollama-darwin.zip"
        elif system == "linux":
            if "x86_64" in machine:
                url = "https://ollama.com/download/ollama-linux-amd64"
            elif "arm64" in machine or "aarch64" in machine:
                url = "https://ollama.com/download/ollama-linux-arm64"

        if not url:
            raise Exception(f"Unsupported platform: {system} {machine}. Please install Ollama manually from ollama.com")

        print(f"Downloading Ollama from {url}...")
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=None) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    content = response.content
                    if url.endswith(".zip"):
                        print("Extracting ZIP...")
                        with zipfile.ZipFile(io.BytesIO(content)) as z:
                            z.extractall(self.bin_dir)
                    else:
                        with open(self.ollama_path, "wb") as f:
                            f.write(content)
                    
                    # Make it executable if it exists
                    binary_path = self.get_binary_path()
                    if binary_path and os.path.exists(binary_path):
                        os.chmod(binary_path, 0o755)
                        print(f"Ollama downloaded successfully to {binary_path}")
                    else:
                        print("Ollama downloaded but binary not found in expected location.")
                else:
                    raise Exception(f"Failed to download Ollama: status {response.status_code}")
        except Exception as e:
            print(f"Download error details: {traceback.format_exc()}")
            raise e

    def start_server(self):
        if not self.is_installed():
            print("Ollama not installed. Cannot start server.")
            return False

        # Check if already running on 11434
        try:
            import socket
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                if s.connect_ex(('127.0.0.1', 11434)) == 0:
                    print("Ollama server is already running.")
                    return True
        except Exception:
            pass

        binary = self.get_binary_path()
        print(f"Starting Ollama server from {binary}...")
        env = os.environ.copy()
        
        try:
            self.process = subprocess.Popen(
                [binary, "serve"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                preexec_fn=os.setsid if hasattr(os, 'setsid') else None
            )
            # Give it a few seconds to start
            time.sleep(3)
            
            # Check if process is still running
            if self.process.poll() is not None:
                _, stderr = self.process.communicate()
                print(f"Ollama server failed to start: {stderr.decode()}")
                return False
                
            return True
        except Exception as e:
            print(f"Error starting Ollama server: {e}")
            return False

    def stop_server(self):
        if self.process:
            print("Stopping Ollama server...")
            try:
                if hasattr(os, 'killpg'):
                    os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
                else:
                    self.process.terminate()
            except Exception as e:
                print(f"Error stopping Ollama server: {e}")
            self.process = None
