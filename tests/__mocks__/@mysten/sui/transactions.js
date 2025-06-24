// Create a proper mock for the Transaction class
function createMockTransaction() {
  console.log('Manual mock Transaction constructor called');
  
  const mockPure = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.u8 = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.u16 = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.u32 = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.u64 = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.u128 = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.u256 = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.bool = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.string = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.address = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.id = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.vector = jest.fn((value) => ({ kind: 'Pure', value }));
  mockPure.option = jest.fn((value) => ({ kind: 'Pure', value }));

  const mockObject = jest.fn((id) => ({ kind: 'Object', id }));
  mockObject.system = jest.fn((id) => ({ kind: 'Object', id }));
  mockObject.clock = jest.fn((id) => ({ kind: 'Object', id }));
  mockObject.random = jest.fn((id) => ({ kind: 'Object', id }));
  mockObject.denyList = jest.fn((id) => ({ kind: 'Object', id }));
  mockObject.option = jest.fn((id) => ({ kind: 'Object', id }));

  const instance = {
    pure: mockPure,
    object: mockObject,
    moveCall: jest.fn().mockReturnThis(),
    transferObjects: jest.fn().mockReturnThis(),
    setGasBudget: jest.fn().mockReturnThis(),
    setSender: jest.fn().mockReturnThis(),
  };
  
  console.log('Transaction instance created:', instance);
  console.log('instance.pure:', instance.pure);
  return instance;
}

const Transaction = jest.fn().mockImplementation(createMockTransaction);

module.exports = {
  Transaction,
  mockPure,
  mockObject,
};