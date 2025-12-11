import { BadRequestException, Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('General')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns a simple hello message to verify the API is running',
  })
  @ApiResponse({
    status: 200,
    description: 'API is running successfully',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('data')
  @ApiOperation({
    summary: 'Get sample data',
    description: 'Returns sample data with metadata (for testing purposes)',
  })
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
  @ApiOperation({
    summary: 'Test error handling',
    description:
      'Throws a sample error to test error handling (for testing purposes)',
  })
  getError() {
    throw new BadRequestException('Something bad happened', {
      cause: new Error(),
      description: 'Some error description',
    });
  }
}
