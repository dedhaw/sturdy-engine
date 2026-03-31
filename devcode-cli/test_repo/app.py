from typing import List

def binary_search(nums: List[int], target: int) -> int:
    """
    Perform a binary search on the sorted list 'nums' to find the index of 'target'.
    
    Args:
        nums (List[int]): A sorted list of integers.
        target (int): The integer to search for.
        
    Returns:
        int: The index of the target if found, otherwise -1.
    """
    left, right = 0, len(nums) - 1
    
    while left <= right:
        mid = left + (right - left) // 2
        mid_value = nums[mid]
        
        if mid_value == target:
            return mid
        elif mid_value < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1

def test_binary_search():
    """
    Test the binary_search function with sample input.
    """
    nums = [1, 2, 3, 4, 5]
    target = 3
    expected_output = 2
    
    result = binary_search(nums, target)
    assert result == expected_output, f"Expected {expected_output}, but got {result}"
    print("Test passed.")

def test_binary_search_not_found():
    """
    Test the binary_search function when target is not in the list.
    """
    nums = [1, 2, 3, 4, 5]
    target = 6
    expected_output = -1
    
    result = binary_search(nums, target)
    assert result == expected_output, f"Expected {expected_output}, but got {result}"
    print("Test passed.")

if __name__ == "__main__":
    test_binary_search()
    test_binary_search_not_found()