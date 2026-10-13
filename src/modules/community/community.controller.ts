import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { CommunityService } from './community.service';
import {
  CreatePostDto,
  UpdatePostDto,
  GetPostsQueryDto,
  CreateCommentDto,
  GetCommentsQueryDto,
  ReportContentDto,
  UpdateReportStatusDto,
} from './dto/community.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoleType } from '../../common/enums/role.enum';
import type { UserDocument } from '../auth/schemas/user.schema';

const multerStorage = diskStorage({
  destination: (req, file, cb) => {
    let folder = 'uploads/community';
    if (file.mimetype.startsWith('video/')) folder = 'uploads/community/videos';
    else if (file.mimetype.startsWith('audio/')) folder = 'uploads/community/audio';
    else if (file.mimetype.startsWith('image/')) folder = 'uploads/community/images';

    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // ─── Statistics (Top 3 Cards) ───────────────────────────────
  @Get('statistics')
  @UseGuards(JwtAuthGuard)
  getStatistics(@CurrentUser() user?: UserDocument) {
    return this.communityService.getStatistics(user?._id?.toString());
  }

  // ─── Feed Posts ─────────────────────────────────────────────
  @Get('posts')
  @UseGuards(JwtAuthGuard)
  getPosts(
    @CurrentUser() user: UserDocument,
    @Query() query: GetPostsQueryDto,
  ) {
    return this.communityService.getPosts(user?._id?.toString() || null, query);
  }

  @Public()
  @Get('posts/public')
  getPublicPosts(@Query() query: GetPostsQueryDto) {
    return this.communityService.getPosts(null, query);
  }

  @Get('posts/:id')
  @UseGuards(JwtAuthGuard)
  getPostById(
    @Param('id') id: string,
    @CurrentUser() user?: UserDocument,
  ) {
    return this.communityService.getPostById(id, user?._id?.toString());
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: multerStorage,
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for video/audio/images
    }),
  )
  createPost(
    @CurrentUser() user: UserDocument,
    @Body() dto: CreatePostDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.communityService.createPost(user._id, dto, files);
  }

  @Put('posts/:id')
  @UseGuards(JwtAuthGuard)
  updatePost(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
  ) {
    return this.communityService.updatePost(user._id, id, dto, user.role);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  deletePost(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.communityService.deletePost(user._id, id, user.role);
  }

  // ─── Like / Love Toggle ──────────────────────────────────────
  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  toggleLikePost(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.communityService.toggleLikePost(user._id, id);
  }

  // ─── Comments & Thousands of Replies ────────────────────────
  @Get('posts/:id/comments')
  @Public()
  getComments(
    @Param('id') id: string,
    @Query() query: GetCommentsQueryDto,
  ) {
    return this.communityService.getComments(id, query);
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  createComment(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(user._id, id, dto);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.communityService.deleteComment(user._id, id, user.role);
  }

  // ─── Report Content (Matching Screenshot 2) ──────────────────
  @Post('report')
  @UseGuards(JwtAuthGuard)
  reportContent(
    @CurrentUser() user: UserDocument,
    @Body() dto: ReportContentDto,
  ) {
    return this.communityService.reportContent(user._id, dto);
  }

  // ─── Admin Moderation Routes ────────────────────────────────
  @Get('admin/reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  getReportsForAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.communityService.getReportsForAdmin(page, limit, status);
  }

  @Patch('admin/reports/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.ADMIN)
  updateReportStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.communityService.updateReportStatus(id, dto);
  }
}

