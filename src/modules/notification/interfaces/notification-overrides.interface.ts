import { NotificationChannelType } from "@generated/enums";

import { NotificationColor, NotificationIcon } from "../constants";

/**
 * Overrides for the pre-defined routing configuration, set per dispatch call.
 */
export interface NotificationOverrides {
    icon?: NotificationIcon;
    color?: NotificationColor;
    channels?: NotificationChannelType[];
    persistNotification?: boolean;
}
