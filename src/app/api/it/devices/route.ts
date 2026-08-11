import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITDevice } from "@/models/ITDevice";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

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

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();
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

    return NextResponse.json({ devices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/it/devices error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const { assetTag, type, brand, modelName, assignedTo, department, os, lastSeen, condition, status } = body;

    if (!assetTag?.trim()) {
      return NextResponse.json({ error: "Asset tag is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Check for duplicate asset tag within the tenant
    const exists = await ITDevice.findOne({ tenantId: tenantObjectId, assetTag: assetTag.trim() });
    if (exists) {
      return NextResponse.json({ error: `Asset tag "${assetTag.trim()}" already exists in your inventory` }, { status: 400 });
    }

    const doc = await ITDevice.create({
      tenantId: tenantObjectId,
      assetTag: assetTag.trim(),
      type: type?.trim() || "Laptop",
      brand: brand?.trim() || "",
      modelName: modelName?.trim() || "",
      assignedTo: assignedTo?.trim() || "—",
      department: department?.trim() || "—",
      os: os?.trim() || "",
      lastSeen: lastSeen || new Date().toISOString().slice(0, 10),
      condition: condition || "Good",
      status: status || "Available",
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_DEVICE_REGISTERED",
      targetName: assetTag.trim(),
      details: `Registered device ${assetTag.trim()} — ${brand || ""} ${modelName || ""}`.trim(),
    });

    return NextResponse.json({ device: doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/it/devices error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
