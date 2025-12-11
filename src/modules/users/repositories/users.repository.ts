import { PrismaService } from '@/database/prisma.service';
import { GenericRepository } from '@/shared/repositories/generic.repository';
import { Injectable } from '@nestjs/common';
import { Prisma, User } from 'generated/prisma/client';
import { IUserRepository } from './users.repository.interface';

@Injectable()
export class UserRepository
  extends GenericRepository<User>
  implements IUserRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, Prisma.ModelName.User);
  }

  // Only custom methods - all CRUD inherited!
  async findByEmail(email: string): Promise<User | null> {
    return (await this.model.findUnique({
      where: { email },
    })) as User | null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return (await this.model.findUnique({
      where: { username },
    })) as User | null;
  }

  async findById(id: string): Promise<User | null> {
    return (await this.model.findUnique({
      where: { id },
    })) as User | null;
  }

  async findActive(params?: { skip?: number; take?: number }): Promise<User[]> {
    return (await this.model.findMany({
      where: { isActive: true },
      skip: params?.skip,
      take: params?.take,
      orderBy: { createdAt: 'desc' },
    })) as User[];
  }
}
