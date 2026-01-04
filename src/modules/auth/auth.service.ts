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

  async login(dto: LoginDto): Promise<AuthResponseDto & TokenPair> {
    const user = await this.validateCredentials(dto.username, dto.password);
    return this.generateAuthResponseWithTokens(user);
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto & TokenPair> {
    await this.isExitUser(dto.email);

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.usersService.createUser({
      ...dto,
      password: hashedPassword,
    });

    return this.generateAuthResponseWithTokens(this.excludePassword(user));
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

      return this.generateTokenPair(this.excludePassword(user));
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

  private async isExitUser(email: string): Promise<void> {
    const exitUser = await this.usersService.getUserByEmail(email);
    if (exitUser) throw new BadRequestException('User already exists');
  }
}
