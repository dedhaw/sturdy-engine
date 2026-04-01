from random import randint

def generate_random_integer() -> int:
    """
    Generate a random integer between 0 and 100.

    Returns:
        int: A random integer.
    """
    return randint(0, 100)

def get_hello_world_message() -> str:
    """
    Returns the string 'hello world'.

    Returns:
        str: The string 'hello world'.
    """
    return "hello world"