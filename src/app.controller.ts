import { BadRequestException, Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('data')
  getData(): {
    data: {
      id: number;
      name: string;
    };
    metadata: {
      total: number;
      next_page: number;
      size: number;
    };
  } {
    return this.appService.getData();
  }

  @Get('error')
  getError() {
    throw new BadRequestException('Something bad happened', {
      cause: new Error(),
      description: 'Some error description',
    });
  }
}
