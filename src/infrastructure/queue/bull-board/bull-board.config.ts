import { INestApplication } from "@nestjs/common";

import { BullBoardService } from "./bull-board.service";

export class BullBoardConfig {
    static setup(app: INestApplication): void {
        const bullBoardService = app.get(BullBoardService);

        if (!bullBoardService.isEnabled()) return;

        const router = bullBoardService.getRouter();

        if (router) {
            app.use(`/${bullBoardService.getPath()}`, router);
        }
    }
}
