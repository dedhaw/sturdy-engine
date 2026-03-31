from fastapi import FastAPI, HTTPException
from typing import List

app = FastAPI()

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

def count_sixes(nums: List[int]) -> int:
    """
    Count how many numbers in the list 'nums' are equal to 6.
    
    Args:
        nums (List[int]): A list of integers.
        
    Returns:
        int: The count of numbers that are equal to 6.
    """
    return nums.count(6)

@app.get("/search/")
async def search(nums: List[int], target: int):
    """
    Endpoint to perform a binary search on a list of numbers.
    
    Args:
        nums (List[int]): A sorted list of integers.
        target (int): The integer to search for.
        
    Returns:
        dict: A dictionary containing the index of the target if found, otherwise an error message.
    """
    result = binary_search(nums, target)
    if result != -1:
        return {"index": result}
    else:
        raise HTTPException(status_code=404, detail="Target not found in the list")

@app.get("/count_sixes/")
async def count_sixes_endpoint(nums: List[int]):
    """
    Endpoint to count how many numbers in the list 'nums' are equal to 6.
    
    Args:
        nums (List[int]): A list of integers.
        
    Returns:
        dict: A dictionary containing the count of numbers that are equal to 6.
    """
    count = count_sixes(nums)
    return {"count_of_sixes": count}

# Existing tests are retained for local execution
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

def test_count_sixes():
    """
    Test the count_sixes function with sample input.
    """
    nums = [1, 2, 3, 4, 5, 6, 6]
    expected_output = 2
    
    result = count_sixes(nums)
    assert result == expected_output, f"Expected {expected_output}, but got {result}"
    print("Test passed.")

if __name__ == "__main__":
    test_binary_search()
    test_binary_search_not_found()
    test_count_sixes()