import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/role.guard';
import { StorageService } from './storage.service';

@ApiTags('Storage')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'storage', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiQuery({ name: 'folder', required: false, type: String })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    return this.storageService.upload(file, folder);
  }

  @Post('upload/multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiQuery({ name: 'folder', required: false, type: String })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    return Promise.all(
      files.map((file) => this.storageService.upload(file, folder)),
    );
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a file by key' })
  @ApiParam({ name: 'key', type: String })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async delete(@Param('key') key: string) {
    await this.storageService.delete(key);
    return { message: 'File deleted successfully' };
  }

  @Get('url/:key')
  @ApiOperation({ summary: 'Get download URL for a file' })
  @ApiParam({ name: 'key', type: String })
  @ApiResponse({ status: 200, description: 'URL retrieved successfully' })
  async getUrl(@Param('key') key: string) {
    return { url: await this.storageService.getUrl(key) };
  }
}
