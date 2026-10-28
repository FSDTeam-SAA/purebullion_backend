import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class ChatDto {
  @IsString() @Length(1, 4000) message: string;
  @IsOptional() @IsUUID() conversationId?: string;
}
export class RenameConversationDto {
  @IsString() @Length(1, 120) title: string;
}
export class GenerateBriefingDto {
  @IsEnum(['morning_snapshot', 'daily_briefing', 'weekly_wrap', 'week_ahead'])
  briefing_type: string;
}
export class IngestKnowledgeDto {
  @IsString() @Length(1, 128) source_id: string;
  @IsString() @Length(1, 500) title: string;
  @IsEnum(['commentary', 'methodology', 'education']) content_type: string;
  @IsString() @Length(1, 1000000) content: string;
  @IsOptional() @IsUrl() url?: string;
  @IsOptional() @IsString() published_at?: string;
  @IsOptional() @IsBoolean() force?: boolean;
}
export class SignalRationaleDto {
  @Matches(/^[A-Za-z0-9_-]{1,32}$/) signal_id: string;
}
