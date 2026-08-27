import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ITDevice } from "@/models/ITDevice";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export const DEVICE_TYPE_CODE: Record<string, string> = {
  Laptop: "LAP",
  Desktop: "DES",
  Monitor: "MON",
  Mobile: "MOB",
  Tablet: "TAB",
  Router: "RTR",
  Printer: "PRT",
  Other: "OTH",
};

export async function getNextAssetTag(
  tenantObjectId: mongoose.Types.ObjectId,
  deviceType: string
): Promise<string> {
  const code = DEVICE_TYPE_CODE[deviceType] || "OTH";
  const prefix = `ACE-${code}-`;

  // Find all existing devices with this prefix for this tenant
  const existingDocs = await ITDevice.find({
    tenantId: tenantObjectId,
    assetTag: { $regex: `^${prefix}\\d+`, $options: "i" },
  })
    .select("assetTag")
    .lean();

  const nums = existingDocs
    .map((d: any) => {
      const match = (d.assetTag || "").match(new RegExp(`^${prefix}(\\d+)`, "i"));
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n: number) => !isNaN(n) && n > 0);

  const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

const SEED_DEVICES = [
  { assetTag: "ACE-LAP-001", type: "Laptop", brand: "Apple", modelName: "MacBook Pro 14\"", assignedTo: "Ahmed Raza", department: "IT", os: "macOS 14 Sonoma", lastSeen: "2026-08-11", condition: "Excellent", status: "In Use" },
  { assetTag: "ACE-LAP-002", type: "Laptop", brand: "Dell", modelName: "XPS 15", assignedTo: "Sara Khan", department: "Ops", os: "Windows 11 Pro", lastSeen: "2026-08-11", condition: "Good", status: "In Use" },
  { assetTag: "ACE-LAP-003", type: "Laptop", brand: "Lenovo", modelName: "ThinkPad X1 Carbon", assignedTo: "Zain Ali", department: "Engineering", os: "Ubuntu 24.04", lastSeen: "2026-08-10", condition: "Good", status: "In Use" },
  { assetTag: "ACE-MON-001", type: "Monitor", brand: "LG", modelName: "UltraFine 4K 27\"", assignedTo: "Ahmed Raza", department: "IT", os: "N/A", lastSeen: "2026-08-11", condition: "Excellent", status: "In Use" },
  { assetTag: "ACE-LAP-004", type: "Laptop", brand: "Apple", modelName: "MacBook Air M2", assignedTo: "Fatima Noor", department: "Design", os: "macOS 14 Sonoma", lastSeen: "2026-08-09", condition: "Excellent", status: "In Use" },
  { assetTag: "ACE-LAP-005", type: "Laptop", brand: "HP", modelName: "EliteBook 840", assignedTo: "—", department: "—", os: "Windows 11 Pro", lastSeen: "2026-07-01", condition: "Good", status: "Available" },
  { assetTag: "ACE-LAP-006", type: "Laptop", brand: "Dell", modelName: "Inspiron 15", assignedTo: "Nadia Rao", department: "HR", os: "Windows 11 Home", lastSeen: "2026-08-08", condition: "Fair", status: "In Repair" },
  { assetTag: "ACE-PHN-001", type: "Mobile", brand: "Apple", modelName: "iPhone 15 Pro", assignedTo: "Omar Malik", department: "Ops", os: "iOS 17", lastSeen: "2026-08-11", condition: "Excellent", status: "In Use" },
  { assetTag: "ACE-RTR-001", type: "Router", brand: "Cisco", modelName: "RV340", assignedTo: "Office Network", department: "IT", os: "Firmware 1.0.4", lastSeen: "2026-08-11", condition: "Good", status: "In Use" },
  { assetTag: "ACE-LAP-007", type: "Laptop", brand: "Lenovo", modelName: "IdeaPad 5", assignedTo: "—", department: "—", os: "Windows 10 Home", lastSeen: "2026-01-15", condition: "Poor", status: "Retired" },
];

export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    await connectToDatabase();

    const url = new URL(request.url);
    const nextTagForType = url.searchParams.get("nextTagForType");

    // Fast endpoint for requesting the next dynamic unique asset tag for a specific device type
    if (nextTagForType) {
      const nextTag = await getNextAssetTag(tenantObjectId, nextTagForType);
      return NextResponse.json({ nextTag });
    }

    const isPrivileged = ["Admin", "OPS", "Sub Admin", "Manager"].includes(session.role);

    let devices = await ITDevice.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();

    if (devices.length === 0) {
      const seedDocs = SEED_DEVICES.map((item) => ({
        ...item,
        tenantId: tenantObjectId,
        createdBy: userObjectId,
      }));
      await ITDevice.insertMany(seedDocs);
      devices = await ITDevice.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    }

    // Pre-calculate the current next unique tag for all device types across the entire tenant DB
    const nextAssetTags: Record<string, string> = {};
    for (const typeName of Object.keys(DEVICE_TYPE_CODE)) {
      nextAssetTags[typeName] = await getNextAssetTag(tenantObjectId, typeName);
    }

    // Non-privileged users only receive their own devices for the list view
    if (!isPrivileged) {
      const name = (session.userName || "").toLowerCase();
      devices = devices.filter((d: any) => (d.assignedTo || "").toLowerCase() === name);
    }

    return NextResponse.json({ devices, nextAssetTags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/it/devices error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // All authenticated tenant users may register a device (employees register their own or HR registers department devices)
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const {
      assetTag,
      type,
      brand,
      modelName,
      serialNumber,
      specs,
      purchaseDate,
      warrantyExpiry,
      assignedTo,
      department,
      os,
      lastSeen,
      condition,
      status,
    } = body;

    const isPrivileged = ["Admin", "OPS", "Sub Admin", "Manager", "HR"].includes(session.role);

    // Non-privileged users can only register devices assigned to themselves
    if (!isPrivileged) {
      const normalise = (s: string) => (s || "").trim().toLowerCase();
      if (assignedTo && normalise(assignedTo) !== normalise(session.userName)) {
        return NextResponse.json(
          { error: "You can only register devices assigned to yourself" },
          { status: 403 }
        );
      }
    }

    await connectToDatabase();

    const selectedType = (type || "Laptop").trim();
    let resolvedAssetTag = (assetTag || "").trim();

    // Auto-generate unique asset tag if blank or placeholder
    if (!resolvedAssetTag || resolvedAssetTag.toLowerCase() === "auto-generated") {
      resolvedAssetTag = await getNextAssetTag(tenantObjectId, selectedType);
    }

    // Check for collision against database records; if taken, automatically assign the next unique number
    let exists = await ITDevice.findOne({ tenantId: tenantObjectId, assetTag: resolvedAssetTag });
    if (exists) {
      resolvedAssetTag = await getNextAssetTag(tenantObjectId, selectedType);
      exists = await ITDevice.findOne({ tenantId: tenantObjectId, assetTag: resolvedAssetTag });
      if (exists) {
        // Fallback with timestamp suffix to guarantee 100% collision-free persistence
        const code = DEVICE_TYPE_CODE[selectedType] || "OTH";
        resolvedAssetTag = `ACE-${code}-${Date.now().toString().slice(-4)}`;
      }
    }

    const doc = await ITDevice.create({
      tenantId: tenantObjectId,
      assetTag: resolvedAssetTag,
      type: selectedType,
      brand: brand?.trim() || "",
      modelName: modelName?.trim() || "",
      serialNumber: serialNumber?.trim() || "",
      specs: specs?.trim() || "",
      purchaseDate: purchaseDate?.trim() || "",
      warrantyExpiry: warrantyExpiry?.trim() || "",
      assignedTo: assignedTo?.trim() || session.userName || "—",
      department: department?.trim() || "—",
      os: os?.trim() || "",
      lastSeen: lastSeen || new Date().toISOString().slice(0, 10),
      condition: condition || "Good",
      status: status || "In Use",
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_DEVICE_REGISTERED",
      targetName: resolvedAssetTag,
      details: `Registered device ${resolvedAssetTag} (${selectedType}) — ${brand || ""} ${modelName || ""}`.trim(),
    });

    return NextResponse.json({ device: doc, assetTag: resolvedAssetTag }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/it/devices error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
