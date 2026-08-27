import { NotificationCategory, NotificationChannelType } from "@generated/enums";

import { NotificationColor, NotificationIcon } from "../constants";

export interface RoutingConfig {
    category: NotificationCategory;
    icon: NotificationIcon;
    color: NotificationColor;
    channels: NotificationChannelType[];
    persistNotification: boolean;
    /**
     * Deep-link target type for client navigation. Null until the app has a real navigation target.
     */
    targetType: string | null;
}
