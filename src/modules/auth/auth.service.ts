import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto, AuthResponseDto, LoginDto } from './dto/auth.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from 'generated/prisma/client';

type UserWithoutPassword = Omit<User, 'password'>;

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateCredentials(dto.username, dto.password);
    return this.generateAuthResponse(user);
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    await this.isExitUser(dto.email);

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const user = await this.usersService.createUser({
      ...dto,
      password: hashedPassword,
    });

    return this.generateAuthResponse(this.excludePassword(user));
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

  private generateAuthResponse(user: UserWithoutPassword): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
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
