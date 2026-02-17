import { Module } from '@nestjs/common';
import { UsersModule } from '@/modules/users/users.module';
import { ConfigModule } from '@nestjs/config';
import configuration from '@/config';
import { DatabaseModule } from '@/database/database.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { StorageModule } from './shared/storage/storage.module';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    StorageModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
