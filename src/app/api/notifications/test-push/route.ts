import { NextResponse } from "next/server";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { checkFcmStatus, sendFcmPush } from "@/lib/fcm";

/**
 * GET: Diagnostic endpoint to verify FCM setup and count of device tokens.
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { userObjectId } = authResult;
    await connectToDatabase();

    const fcmStatus = await checkFcmStatus();
    const currentUser = await User.findById(userObjectId).select("name email deviceTokens").lean();

    return NextResponse.json({
      fcmStatus,
      userDeviceTokensCount: currentUser?.deviceTokens?.length || 0,
      userDeviceTokens: currentUser?.deviceTokens || [],
      serverTimestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to inspect push status" }, { status: 500 });
  }
}

/**
 * POST: Send a real-time test push notification to the logged-in user's device(s).
 */
export async function POST() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { userObjectId } = authResult;
    await connectToDatabase();

    const fcmStatus = await checkFcmStatus();
    if (!fcmStatus.configured) {
      return NextResponse.json(
        {
          success: false,
          error: "FCM_SERVICE_ACCOUNT_JSON is not configured on the server environment.",
          details: fcmStatus.error,
        },
        { status: 400 }
      );
    }

    const currentUser = await User.findById(userObjectId).select("name deviceTokens").lean();
    const tokens = currentUser?.deviceTokens || [];

    if (tokens.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No mobile device tokens found for this user. Log in through the mobile app to register your device.",
        },
        { status: 400 }
      );
    }

    await sendFcmPush(tokens, {
      title: "NexAce Test Push Alert",
      message: `Test notification sent successfully to your mobile app at ${new Date().toLocaleTimeString()}!`,
      type: "system",
      linkUrl: "/dashboard/notifications",
    });

    return NextResponse.json({
      success: true,
      message: `Test push notification dispatched to ${tokens.length} registered device(s).`,
      fcmStatus,
      tokensCount: tokens.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to dispatch test push" }, { status: 500 });
  }
}
