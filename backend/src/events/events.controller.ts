import { Controller, Request, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RealtimeEvent } from './events.dto';
import { EventsService } from './events.service';

@ApiTags('Temps reel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Sse()
  events(@Request() req: { user: { sub: string } }): Observable<MessageEvent> {
    return this.eventsService.events().pipe(
      map((event: RealtimeEvent) => ({
        data: JSON.stringify(event),
      }) as MessageEvent),
    );
  }
}
