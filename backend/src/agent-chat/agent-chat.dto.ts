import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AgentChatDto {
  @ApiProperty({ example: 'Créer un compte pour john.doe@bh.tn' })
  @IsString()
  @IsNotEmpty()
  message!: string;
}
