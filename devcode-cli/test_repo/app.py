import logging

def print_hello_world():
    logger = logging.getLogger(__name__)
    logger.info(get_hello_world_message())

def get_hello_world_message():
    return "hello world"

# New function to print hello world
def display_message():
    logger = logging.getLogger(__name__)
    message = get_hello_world_message()
    logger.info(message)
    # Ensuring that the existing logic remains intact and the new functionality is appended.
    print_hello_world()