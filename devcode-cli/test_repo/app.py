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

# 2sum code example
def two_sum(nums: list[int], target: int) -> list[int]:
    num_to_index = {}
    for index, num in enumerate(nums):
        complement = target - num
        if complement in num_to_index:
            return [num_to_index[complement], index]
        num_to_index[num] = index

# Example usage of the two_sum function
def run_two_sum_example():
    nums = [2, 7, 11, 15]
    target = 9
    indices = two_sum(nums, target)
    logger = logging.getLogger(__name__)
    logger.info(f"Indices for two sum: {indices}")

if __name__ == "__main__":
    run_two_sum_example()