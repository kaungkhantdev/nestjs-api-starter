import { Module } from '@nestjs/common';
import { UserRepository } from './repositories/users.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { USER_REPOSITORY } from './constants';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
