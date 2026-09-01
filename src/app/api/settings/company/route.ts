import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * GET: Fetch company / organization tenant details
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tenantIdObj = new mongoose.Types.ObjectId(session.tenantId);

    const tenant = await Tenant.findById(tenantIdObj).lean();
    if (!tenant) {
      return NextResponse.json({ error: "Company details not found" }, { status: 404 });
    }

    const totalUsers = await User.countDocuments({ tenantId: tenantIdObj });

    return NextResponse.json({
      company: {
        ...tenant,
        totalUsers,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Company details error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT: Update company / organization profile & details
 */
export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isElevated =
      session.role?.toLowerCase() === "admin" ||
      session.role?.toLowerCase() === "ops" ||
      session.role?.toLowerCase() === "manager";

    if (!isElevated) {
      return NextResponse.json({ error: "Forbidden: Admin or elevated permissions required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      logoUrl,
      tagline,
      legalName,
      registrationNumber,
      entityType,
      email,
      billingEmail,
      phone,
      tollFreePhone,
      website,
      taxId,
      industry,
      currency,
      timezone,
      dateFormat,
      address,
      city,
      state,
      country,
      postalCode,
      bankDetails,
      socialLinks,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    await connectToDatabase();
    const tenantIdObj = new mongoose.Types.ObjectId(session.tenantId);

    const generatedSlug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const updatePayload: Record<string, any> = {
      name: name.trim(),
      slug: generatedSlug || `workspace-${tenantIdObj.toString().slice(-6)}`,
    };
    
    if (logoUrl !== undefined) updatePayload.logoUrl = logoUrl.trim();
    if (tagline !== undefined) updatePayload.tagline = tagline.trim();
    if (legalName !== undefined) updatePayload.legalName = legalName.trim();
    if (registrationNumber !== undefined) updatePayload.registrationNumber = registrationNumber.trim();
    if (entityType !== undefined) updatePayload.entityType = entityType.trim();
    if (email !== undefined) updatePayload.email = email.trim();
    if (billingEmail !== undefined) updatePayload.billingEmail = billingEmail.trim();
    if (phone !== undefined) updatePayload.phone = phone.trim();
    if (tollFreePhone !== undefined) updatePayload.tollFreePhone = tollFreePhone.trim();
    if (website !== undefined) updatePayload.website = website.trim();
    if (taxId !== undefined) updatePayload.taxId = taxId.trim();
    if (industry !== undefined) updatePayload.industry = industry.trim();
    if (currency !== undefined) updatePayload.currency = currency.trim();
    if (timezone !== undefined) updatePayload.timezone = timezone.trim();
    if (dateFormat !== undefined) updatePayload.dateFormat = dateFormat.trim();
    if (address !== undefined) updatePayload.address = address.trim();
    if (city !== undefined) updatePayload.city = city.trim();
    if (state !== undefined) updatePayload.state = state.trim();
    if (country !== undefined) updatePayload.country = country.trim();
    if (postalCode !== undefined) updatePayload.postalCode = postalCode.trim();

    if (bankDetails) {
      updatePayload.bankDetails = {
        bankName: bankDetails.bankName?.trim() || "",
        accountName: bankDetails.accountName?.trim() || "",
        accountNo: bankDetails.accountNo?.trim() || "",
        ifscCode: bankDetails.ifscCode?.trim() || "",
        branch: bankDetails.branch?.trim() || "",
        upiId: bankDetails.upiId?.trim() || "",
      };
    }

    if (socialLinks) {
      updatePayload.socialLinks = {
        linkedin: socialLinks.linkedin?.trim() || "",
        twitter: socialLinks.twitter?.trim() || "",
        github: socialLinks.github?.trim() || "",
        facebook: socialLinks.facebook?.trim() || "",
        youtube: socialLinks.youtube?.trim() || "",
      };
    }

    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantIdObj,
      { $set: updatePayload },
      { new: true, runValidators: false }
    ).lean();

    if (!updatedTenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, company: updatedTenant });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PUT Company details error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
