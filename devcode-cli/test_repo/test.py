# FILE: test_repo/test.py

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def greet(name: str):
    logger.info(f"Hello, {name}!")

if __name__ == "__main__":
    greet("world")