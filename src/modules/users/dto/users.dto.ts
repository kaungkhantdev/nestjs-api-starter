import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'jane.smith@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-#])/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&._-#)',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'Jane',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Smith',
  })
  @IsString()
  lastName: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'Jane',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Smith',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'New password',
    example: 'NewSecurePass123!',
    minLength: 6,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-#])/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&._-#)',
  })
  password?: string;
}
