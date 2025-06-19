// Simple test to verify Jest is working
describe('Simple Test Suite', () => {
  test('basic math should work', () => {
    expect(2 + 2).toBe(4);
  });

  test('string concatenation should work', () => {
    expect('hello' + ' world').toBe('hello world');
  });

  test('array operations should work', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr[0]).toBe(1);
  });
});