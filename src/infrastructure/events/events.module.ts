import { Global, Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

@Global()
@Module({
    imports: [
        EventEmitterModule.forRoot({
            wildcard: true,
            delimiter: ".",
            maxListeners: 10,
            verboseMemoryLeak: true,
        }),
    ],
})
export class EventsModule {}
