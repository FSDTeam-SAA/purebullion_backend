import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CommunityPost,
  CommunityPostSchema,
} from './schemas/community-post.schema';
import {
  CommunityComment,
  CommunityCommentSchema,
} from './schemas/community-comment.schema';
import {
  CommunityLike,
  CommunityLikeSchema,
} from './schemas/community-like.schema';
import {
  CommunityReport,
  CommunityReportSchema,
} from './schemas/community-report.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../../infrastructure/cloudinary/cloudinary.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommunityPost.name, schema: CommunityPostSchema },
      { name: CommunityComment.name, schema: CommunityCommentSchema },
      { name: CommunityLike.name, schema: CommunityLikeSchema },
      { name: CommunityReport.name, schema: CommunityReportSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    CloudinaryModule,
  ],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}

