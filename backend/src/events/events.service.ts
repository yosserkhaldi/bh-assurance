import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { RealtimeEvent } from './events.dto';

@Injectable()
export class EventsService {
  private readonly events$ = new Subject<RealtimeEvent>();

  emit(event: RealtimeEvent): void {
    this.events$.next(event);
  }

  events(): Observable<RealtimeEvent> {
    return this.events$.asObservable();
  }
}
