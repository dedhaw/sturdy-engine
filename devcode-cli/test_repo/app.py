import logging
from typing import List

def binary_search(sorted_nums: List[int], target: int) -> int:
    logger = logging.getLogger(__name__)
    low = 0
    high = len(sorted_nums) - 1
    
    while low <= high:
        mid = (low + high) // 2
        mid_val = sorted_nums[mid]
        
        if mid_val == target:
            logger.debug(f"Found target {target} at index {mid}")
            return mid
        elif mid_val < target:
            low = mid + 1
        else:
            high = mid - 1
    
    logger.debug(f"Target {target} not found in array")
    return -1

def run_binary_search_example():
    sorted_nums = [1, 3, 5, 7, 9]
    target = 5
    index = binary_search(sorted_nums, target)
    logger = logging.getLogger(__name__)
    logger.info(f"Binary search result: Index of {target} is {index}")

if __name__ == "__main__":
    run_two_sum_example()
    run_binary_search_example()