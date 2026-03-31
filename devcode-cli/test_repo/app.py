from typing import List

def two_sum(nums: List[int], target: int) -> List[int]:
    """
    Finds two numbers in the list 'nums' that add up to the 'target'.
    
    Args:
        nums (List[int]): A list of integers.
        target (int): The target sum.
        
    Returns:
        List[int]: A list containing the indices of the two numbers that add up to the target.
        
    Raises:
        ValueError: If no two numbers add up to the target.
    """
    num_to_index = {}
    
    for index, number in enumerate(nums):
        complement = target - number
        if complement in num_to_index:
            return [num_to_index[complement], index]
        num_to_index[number] = index
    
    raise ValueError("No two numbers add up to the target")

# --- ADDED TEST FUNCTION ---
def test_two_sum():
    """
    Test the two_sum function with sample input.
    """
    nums = [2, 7, 11, 15]
    target = 9
    expected_output = [0, 1]
    
    try:
        result = two_sum(nums, target)
        assert result == expected_output, f"Expected {expected_output}, but got {result}"
        print("Test passed.")
    except ValueError as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    test_two_sum()