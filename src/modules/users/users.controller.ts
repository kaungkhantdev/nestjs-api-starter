import {
  Controller,
  Get,
  // Put,
  // Delete,
  // Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  // UpdateUserDto,
  UserResponseDto,
} from './dto/user.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RolesGuard } from '@/common/guards/role.guard';
import { UserRole } from 'generated/prisma/enums';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile information of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
  })
  async getProfile(
    @CurrentUser('id') userId: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.getFindById(userId);
    if (!user) throw new BadRequestException('Not found user');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all users (Admin only)',
    description: 'Returns a paginated list of all users. Requires ADMIN role.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'User does not have ADMIN role',
  })
  async findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return await this.usersService.getAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get user by ID (Admin only)',
    description: 'Returns a specific user by their ID. Requires ADMIN role.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User unique identifier',
    example: 'uuid-123',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'User not found',
  })
  @ApiUnauthorizedResponse({
    description: 'User is not authenticated',
  })
  @ApiForbiddenResponse({
    description: 'User does not have ADMIN role',
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.getFindById(id);
    if (!user) throw new BadRequestException('Not found user');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  // @Put('me')
  // async updateProfile(
  //   @CurrentUser('id') userId: string,
  //   @Body() updateUserDto: UpdateUserDto,
  // ): Promise<UserResponseDto> {
  //   const user = await this.usersService.update(userId, updateUserDto);
  //   const { password, ...result } = user;
  //   return result;
  // }

  // @Put(':id')
  // @Roles(UserRole.ADMIN)
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateUserDto: UpdateUserDto,
  // ): Promise<UserResponseDto> {
  //   const user = await this.usersService.update(id, updateUserDto);
  //   const { password, ...result } = user;
  //   return result;
  // }

  // @Delete(':id')
  // @Roles(UserRole.ADMIN)
  // async delete(@Param('id') id: string): Promise<{ message: string }> {
  //   await this.usersService.delete(id);
  //   return { message: 'User deleted successfully' };
  // }
}
