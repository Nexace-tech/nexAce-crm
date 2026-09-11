import { Capacitor } from "@capacitor/core";
import { Geolocation, Position } from "@capacitor/geolocation";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Network, ConnectionStatus } from "@capacitor/network";
import { PushNotifications, Token, PushNotificationSchema } from "@capacitor/push-notifications";

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
   */
  async getLocation(): Promise<GeoCoordinates> {
    if (this.isNative()) {
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted") {
        const req = await Geolocation.requestPermissions();
        if (req.location !== "granted") {
          throw new Error("Location permission denied by user");
        }
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
    }

    // Web Fallback (HTML5 Geolocation API)
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        return reject(new Error("Geolocation not supported by device browser"));
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          });
        },
        (err) => reject(new Error(err.message || "Failed to retrieve location")),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
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
   * Initialize native push notifications and register FCM/APNs token
   */
  async initPushNotifications(onNotificationReceived?: (notif: PushNotificationSchema) => void): Promise<string | null> {
    if (!this.isNative()) return null;

    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== "granted") {
        perm = await PushNotifications.requestPermissions();
      }

      if (perm.receive !== "granted") {
        console.warn("Push notification permission not granted");
        return null;
      }

      return new Promise<string | null>((resolve) => {
        PushNotifications.addListener("registration", async (token: Token) => {
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
            console.error("Failed to register device token with server:", apiErr);
          }
          resolve(token.value);
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("Error registering push notifications:", err);
          resolve(null);
        });

        if (onNotificationReceived) {
          PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
            onNotificationReceived(notification);
          });
        }

        PushNotifications.register();
      });
    } catch (err) {
      console.error("Failed to initialize push notifications:", err);
      return null;
    }
  },
};
