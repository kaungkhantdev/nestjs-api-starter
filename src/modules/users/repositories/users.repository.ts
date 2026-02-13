import { PrismaService } from '@/core/database/prisma.service';
import { GenericRepository } from '@/core/repository';
import { Injectable } from '@nestjs/common';
import { Prisma, User } from 'generated/prisma/client';
import { IUsersRepository } from './users.repository.interface';

@Injectable()
export class UsersRepository
  extends GenericRepository<User>
  implements IUsersRepository
{
  constructor(prisma: PrismaService) {
    super(prisma, Prisma.ModelName.User);
  }

  // Only custom methods - all CRUD inherited!
  async findByEmail(email: string): Promise<User | null> {
    return await this.model.findUnique({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.model.findUnique({
      where: { username },
    });
  }

  async findById(id: string): Promise<User | null> {
    return await this.model.findUnique({
      where: { id },
    });
  }

  async findActive(params?: { skip?: number; take?: number }): Promise<User[]> {
    return await this.model.findMany({
      where: { isActive: true },
      skip: params?.skip,
      take: params?.take,
      orderBy: { createdAt: 'desc' },
    });
  }
}
