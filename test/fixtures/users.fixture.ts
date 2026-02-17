import { UserRole } from 'generated/prisma/enums';

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  password: '$2b$10$hashedpassword123456789',
  refreshTokenHash: '$2b$10$hashedpassword123456789',
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.CUSTOMER,
  isActive: true,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockAdmin = {
  id: 'admin-123',
  email: 'admin@example.com',
  username: 'adminuser',
  password: '$2b$10$hashedpassword123456789',
  refreshTokenHash: '$2b$10$hashedpassword123456789',
  firstName: 'Admin',
  lastName: 'User',
  role: UserRole.ADMIN,
  isActive: true,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockCustomer = {
  id: 'customer-123',
  email: 'customer@example.com',
  username: 'customeruser',
  password: '$2b$10$hashedpassword123456789',
  refreshTokenHash: '$2b$10$hashedpassword123456789',
  firstName: 'Customer',
  lastName: 'User',
  role: UserRole.CUSTOMER,
  isActive: true,
  deletedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockInactiveUser = {
  ...mockUser,
  id: 'inactive-user-123',
  email: 'inactive@example.com',
  username: 'inactiveuser',
  isActive: false,
  refreshTokenHash: null,
};

export const mockUserWithoutPassword = {
  id: mockUser.id,
  email: mockUser.email,
  username: mockUser.username,
  firstName: mockUser.firstName,
  lastName: mockUser.lastName,
  role: mockUser.role,
  isActive: mockUser.isActive,
  refreshTokenHash: mockUser.refreshTokenHash,
  deletedAt: mockUser.deletedAt,
  createdAt: mockUser.createdAt,
  updatedAt: mockUser.updatedAt,
};

export const mockUsers = [mockUser, mockAdmin, mockCustomer];

export const createMockUser = (overrides: Partial<typeof mockUser> = {}) => ({
  ...mockUser,
  ...overrides,
});
