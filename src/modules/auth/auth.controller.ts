import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  RefreshResponseDto,
  LogoutResponseDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from 'generated/prisma/client';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account with the provided credentials',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiConflictResponse({
    description: 'User with this email or username already exists',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, accessToken, refreshToken } =
      await this.authService.register(registerDto);

    // Set refreshToken as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      user,
      accessToken,
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user and returns a JWT access token',
  })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, accessToken, refreshToken } =
      await this.authService.login(loginDto);

    // Set refreshToken as httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      user,
      accessToken,
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generates a new access token using the refresh token from httpOnly cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    type: RefreshResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'No refresh token or invalid refresh token',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RefreshResponseDto> {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refresh(refreshToken);

    // Rotate refresh token
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/v1/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { accessToken };
  }

  @Public()
  @Post('logout')
  @ApiOperation({
    summary: 'Logout user',
    description: 'Clears the refresh token cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    type: LogoutResponseDto,
  })
  logout(@Res({ passthrough: true }) res: Response): LogoutResponseDto {
    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized - Invalid or missing token',
  })
  me(@CurrentUser() user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
