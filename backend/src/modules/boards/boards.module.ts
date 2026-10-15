import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { BoardsController } from "./boards.controller.js";
import { BoardsService } from "./boards.service.js";
import { DrizzleBoardsStore } from "./drizzle-boards.store.js";
import { BOARDS_STORE } from "./boards.store.js";

@Module({
  imports: [AuthModule],
  controllers: [BoardsController],
  providers: [
    BoardsService,
    DrizzleBoardsStore,
    {
      provide: BOARDS_STORE,
      useExisting: DrizzleBoardsStore,
    },
  ],
})
export class BoardsModule {}
