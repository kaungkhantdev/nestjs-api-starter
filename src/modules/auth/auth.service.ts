import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, AuthResponseDto, LoginDto } from './dto/auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from 'generated/prisma/client';
import { ConfigService } from '@nestjs/config';

type UserWithoutPassword = Omit<User, 'password'>;

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private generateTokenPair(user: UserWithoutPassword): TokenPair {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn:
        this.configService.get<JwtSignOptions['expiresIn']>(
          'jwt.accessTokenExpiresIn',
        ) ?? '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn:
        this.configService.get<JwtSignOptions['expiresIn']>(
          'jwt.refreshTokenExpiresIn',
        ) ?? '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateAuthResponseWithTokens(
    user: UserWithoutPassword,
  ): AuthResponseDto & TokenPair {
    const tokens = this.generateTokenPair(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  private excludePassword(user: User): UserWithoutPassword {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private async isExitUser(email: string, username: string): Promise<void> {
    const [byEmail, byUsername] = await Promise.all([
      this.usersService.getUserByEmail(email),
      this.usersService.getUserByUsername(username),
    ]);
    if (byEmail) throw new BadRequestException('Email is already registered');
    if (byUsername) throw new BadRequestException('Username is already taken');
  }

  async login(dto: LoginDto): Promise<AuthResponseDto & TokenPair> {
    const user = await this.validateCredentials(dto.username, dto.password);
    const result = this.generateAuthResponseWithTokens(user);
    await this.usersService.setRefreshTokenHash(user.id, result.refreshToken);
    return result;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto & TokenPair> {
    await this.isExitUser(dto.email, dto.username);

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.usersService.createUser({
      ...dto,
      password: hashedPassword,
    });

    const result = this.generateAuthResponseWithTokens(
      this.excludePassword(user),
    );
    await this.usersService.setRefreshTokenHash(user.id, result.refreshToken);
    return result;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const user = await this.usersService.getFindById(payload.sub);

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify stored hash matches the incoming token
      if (
        !user.refreshTokenHash ||
        !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = this.generateTokenPair(this.excludePassword(user));

      // Rotate — store hash of new refresh token
      await this.usersService.setRefreshTokenHash(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<UserWithoutPassword> {
    const user = await this.usersService.getUserByUsername(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    return this.excludePassword(user);
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.clearRefreshTokenHash(userId);
  }
}
