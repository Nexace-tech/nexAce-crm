import { Capacitor } from "@capacitor/core";
import { Geolocation, Position } from "@capacitor/geolocation";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Network, ConnectionStatus } from "@capacitor/network";
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from "@capacitor/push-notifications";

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export const NativeService = {
  /**
   * Check if running inside native mobile shell (iOS or Android)
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  },

  /**
   * Get current platform name
   */
  getPlatform(): "android" | "ios" | "web" {
    return Capacitor.getPlatform() as "android" | "ios" | "web";
  },

  /**
   * Subtle tactile haptic vibration feedback
   */
  async haptic(style: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light"): Promise<void> {
    try {
      if (this.isNative()) {
        if (style === "success") {
          await Haptics.notification({ type: NotificationType.Success });
        } else if (style === "warning") {
          await Haptics.notification({ type: NotificationType.Warning });
        } else if (style === "error") {
          await Haptics.notification({ type: NotificationType.Error });
        } else {
          const impactMap = {
            light: ImpactStyle.Light,
            medium: ImpactStyle.Medium,
            heavy: ImpactStyle.Heavy,
          };
          await Haptics.impact({ style: impactMap[style] || ImpactStyle.Light });
        }
      } else if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(style === "light" ? 15 : style === "medium" ? 30 : 50);
      }
    } catch {
      // Haptics silent fallback
    }
  },

  /**
   * Obtain GPS coordinates for shift clock-in and geofence verification
  /**
   * Geolocation completely removed - returns null immediately without prompting for browser/device permissions
   */
  async getLocation(): Promise<GeoCoordinates | null> {
    return null;
  },

  /**
   * Capture photo via camera or pick from gallery for receipts / document vault
   */
  async capturePhoto(source: "camera" | "gallery" = "camera"): Promise<string> {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
    });

    if (!photo.dataUrl) {
      throw new Error("No photo data retrieved");
    }

    return photo.dataUrl;
  },

  /**
   * Listen to network connectivity changes (Online / Offline)
   */
  async listenNetwork(callback: (connected: boolean) => void): Promise<() => void> {
    try {
      const initialStatus: ConnectionStatus = await Network.getStatus();
      callback(initialStatus.connected);

      const listener = await Network.addListener("networkStatusChange", (status: ConnectionStatus) => {
        callback(status.connected);
      });

      return () => {
        listener.remove();
      };
    } catch {
      // Fallback for standard browsers
      if (typeof window !== "undefined") {
        const handleOnline = () => callback(true);
        const handleOffline = () => callback(false);
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        return () => {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
        };
      }
      return () => {};
    }
  },

  /**
   * Initialize native push notifications, create channels, and register FCM/APNs token
   */
  async initPushNotifications(onNotificationReceived?: (notif: PushNotificationSchema) => void): Promise<string | null> {
    if (!this.isNative()) return null;

    try {
      // 1. Check and request notification permissions
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== "granted") {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive !== "granted") {
        console.warn("[PushNotifications] Permission not granted:", perm.receive);
        return null;
      }

      // 2. On Android, create the required notification channel before registering
      if (Capacitor.getPlatform() === "android") {
        try {
          await PushNotifications.createChannel({
            id: "nexace_crm_default",
            name: "NexAce CRM Alerts",
            description: "General CRM alerts, updates, task assignments, and chat messages",
            importance: 5, // High importance (heads-up banner + sound)
            visibility: 1, // Public on lockscreen
            sound: "default",
            vibration: true,
            lights: true,
            lightColor: "#00c5a0",
          });
          console.log("[PushNotifications] Android notification channel 'nexace_crm_default' registered");
        } catch (channelErr) {
          console.warn("[PushNotifications] Failed to create notification channel:", channelErr);
        }
      }

      // 3. Remove existing listeners to avoid duplicate firing
      await PushNotifications.removeAllListeners();

      return new Promise<string | null>((resolve) => {
        // Token received from Firebase/APNs
        PushNotifications.addListener("registration", async (token: Token) => {
          console.log("[PushNotifications] Device registered with FCM token:", token.value.slice(0, 15) + "...");
          try {
            await fetch("/api/notifications/register-device", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: token.value,
                platform: Capacitor.getPlatform(),
              }),
            });
          } catch (apiErr) {
            console.error("[PushNotifications] Failed to register device token with server:", apiErr);
          }
          resolve(token.value);
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("[PushNotifications] Error registering push notifications:", err);
          resolve(null);
        });

        // Notification arrived while app is open (foreground)
        PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
          console.log("[PushNotifications] Received in foreground:", notification.title);
          // Haptic tactile feedback
          NativeService.haptic("medium");
          if (onNotificationReceived) {
            onNotificationReceived(notification);
          }
        });

        // User tapped on the notification in the Android/iOS notification drawer
        PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
          console.log("[PushNotifications] Action performed:", action);
          const linkUrl = action.notification.data?.linkUrl;
          if (linkUrl && typeof window !== "undefined" && typeof linkUrl === "string" && linkUrl.startsWith("/")) {
            window.location.href = linkUrl;
          }
        });

        PushNotifications.register();
      });
    } catch (err) {
      console.error("[PushNotifications] Failed to initialize push notifications:", err);
      return null;
    }
  },
};
