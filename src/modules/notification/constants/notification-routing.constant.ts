import { NotificationCategory, NotificationChannelType } from "@generated/enums";

import { RoutingConfig } from "../interfaces";

import { NotificationColor } from "./notification-colors.constant";
import { NotificationIcon } from "./notification-icons.constant";
import { NotificationType } from "./notification-types.constant";

/**
 * Single source of truth for notification behavior.
 * Groups every notification the app emits with its category, icon, color, delivery channels,
 * and whether it should persist as an inbox record. Handlers can override some attributes per instance.
 */
export const NotificationRouting: Record<NotificationType, RoutingConfig> = {
    BROADCAST: {
        category: NotificationCategory.MARKETING,
        icon: NotificationIcon.SYSTEM,
        color: NotificationColor.INFO,
        channels: [],
        persistNotification: false,
        targetType: null,
    },
    WELCOME: {
        category: NotificationCategory.TRANSACTIONAL,
        icon: NotificationIcon.ACCOUNT,
        color: NotificationColor.INFO,
        channels: [NotificationChannelType.EMAIL],
        persistNotification: true,
        targetType: null,
    },
    SECURITY_ALERT: {
        category: NotificationCategory.SECURITY,
        icon: NotificationIcon.SECURITY,
        color: NotificationColor.DANGER,
        channels: [NotificationChannelType.EMAIL],
        persistNotification: true,
        targetType: null,
    },
    ACCOUNT_UPDATED: {
        category: NotificationCategory.ACTIVITY,
        icon: NotificationIcon.ACCOUNT,
        color: NotificationColor.INFO,
        channels: [],
        persistNotification: true,
        targetType: null,
    },
    PASSWORD_CHANGED: {
        category: NotificationCategory.SECURITY,
        icon: NotificationIcon.SECURITY,
        color: NotificationColor.WARNING,
        channels: [],
        persistNotification: true,
        targetType: null,
    },
};
