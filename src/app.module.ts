import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './auth/auth.module';
import { CoupleModule } from './couple/couple.module';
import { DiaryModule } from './diary/diary.module';
import { MessagesModule } from './messages/messages.module';
import { SettingsModule } from './settings/settings.module';
import { PlacesModule } from './places/places.module';
import { UploadsModule } from './uploads/uploads.module';
import { PlaceLogsModule } from './place-logs/place-logs.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CoupleModule,
    DiaryModule,
    MessagesModule,
    SettingsModule,
    PlacesModule,
    UploadsModule,
    PlaceLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
