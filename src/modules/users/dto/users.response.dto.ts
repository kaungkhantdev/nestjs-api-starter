import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma/enums';

@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ description: 'User unique identifier', example: 'uuid-456' })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'User email address',
    example: 'jane.smith@example.com',
  })
  email: string;

  @Expose()
  @ApiProperty({ description: 'Username', example: 'janesmith' })
  username: string;

  @Expose()
  @ApiProperty({ description: 'User first name', example: 'Jane' })
  firstName: string;

  @Expose()
  @ApiProperty({ description: 'User last name', example: 'Smith' })
  lastName: string;

  @Expose()
  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Expose()
  @ApiProperty({ description: 'User account status', example: true })
  isActive: boolean;

  @Expose()
  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Account last update timestamp',
    example: '2024-01-20T14:45:00Z',
  })
  updatedAt: Date;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items: UserResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;
}
