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

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CoupleModule,
    DiaryModule,
    MessagesModule,
    SettingsModule,
    PlacesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
