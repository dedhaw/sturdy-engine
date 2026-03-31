# test_repo/app.py

import sys
import logging
from pathlib import Path
from typing import Optional, List
import typer
from dataclasses import dataclass

# 1. Setup Logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# 2. Domain Exceptions
class CLIError(Exception):
    """Base exception for this tool."""
    pass

class ProcessingError(CLIError):
    """Raised when data transformation fails."""
    pass

# 3. Core Logic (Interface Agnostic)
def transform_data(input_file: Path, uppercase: bool = False) -> str:
    """
    Reads a file and applies transformations.
    
    Args:
        input_file: Path to the target file.
        uppercase: Whether to shout the output.
        
    Returns:
        The transformed string content.
        
    Raises:
        ProcessingError: If the file cannot be read.
    """
    try:
        if not input_file.exists():
            raise FileNotFoundError(f"File not found: {input_file}")
            
        content = input_file.read_text(encoding="utf-8")
        return content.upper() if uppercase else content
    except Exception as e:
        logger.debug(f"Traceback: {e}")
        raise ProcessingError(f"Failed to process {input_file}: {e}")

# 4. CLI Interface
app = typer.Typer(
    help="Architect-level Python CLI Template",
    add_completion=False,
    rich_markup_mode="rich"
)

@app.command()
def process(
    path: Path = typer.Argument(..., help="Path to the input file"),
    shout: bool = typer.Option(False, "--shout", "-s", help="Convert output to uppercase"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable debug logging")
):
    """Execute the file processing pipeline."""
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        
    try:
        result = transform_data(path, uppercase=shout)
        typer.echo(result)
    except CLIError as e:
        typer.secho(f"Error: {e}", fg=typer.colors.RED, err=True)
        raise typer.Exit(code=1)

@app.command()
def hello():
    """Prints a hello world message."""
    logger.info("Hello, World!")

if __name__ == "__main__":
    app()