import uvicorn
from app import app

if __name__ == "__main__":
    # Run the FastAPI app programmatically
    # The host and port match what the CLI expects
    uvicorn.run(app, host="127.0.0.1", port=8040)
