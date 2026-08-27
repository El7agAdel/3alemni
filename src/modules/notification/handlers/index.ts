import { OnAuthNotificationHandler } from "./on-auth.handler";
import { OnNotificationHandler } from "./on-notification.handler";
import { OnUserNotificationHandler } from "./on-user.handler";

export const NotificationEventHandlers = [OnNotificationHandler, OnAuthNotificationHandler, OnUserNotificationHandler];
