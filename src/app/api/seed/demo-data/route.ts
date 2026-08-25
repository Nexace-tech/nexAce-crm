import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models/Client";
import { Referral } from "@/models/Referral";
import { ChatMessage } from "@/models/ChatMessage";
import { Announcement } from "@/models/Announcement";
import { SalesDeal } from "@/models/SalesDeal";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function POST() {
  try {
    const authResult = await requireTenantSession(["Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    await connectToDatabase();

    // 1. Seed Sales Deals
    const dealCount = await SalesDeal.countDocuments({ tenantId: tenantObjectId });
    if (dealCount === 0) {
      await SalesDeal.insertMany([
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          clientAccount: "NovaWave LLC",
          dealName: "Annual Software Enterprise",
          dealValue: 1994938,
          stage: "Closed Won",
          probability: 90,
          owner: session.userName || "Robert Johnson",
          expectedClose: "2026-10-31",
          venture: "Ace Consultancys",
          notes: "Multi-year enterprise contract signed.",
        },
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          clientAccount: "Silver Hawk",
          dealName: "CRM Onboarding & Migration",
          dealValue: 1544540,
          stage: "Closed Won",
          probability: 90,
          owner: "Isabella Cooper",
          expectedClose: "2026-11-15",
          venture: "Ace Consultancys",
          notes: "Complete migration across 5 departments.",
        },
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          clientAccount: "Summit LLC",
          dealName: "Enterprise Plan Rollout",
          dealValue: 1036390,
          stage: "Closed Won",
          probability: 80,
          owner: "John Smith",
          expectedClose: "2026-09-30",
          venture: "Ace Consultancys",
          notes: "Custom branding and workspace isolation enabled.",
        },
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          clientAccount: "Bluesky Industries",
          dealName: "BrightWorks Global Retainer",
          dealValue: 1015280,
          stage: "Proposal Sent",
          probability: 72,
          owner: "Sophia Parker",
          expectedClose: "2026-12-20",
          venture: "Ace Consultancys",
          notes: "Proposal submitted to executive board.",
        },
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          clientAccount: "HealthTech Innovations",
          dealName: "Sales Pipeline Automation",
          dealValue: 1014112,
          stage: "Negotiation",
          probability: 60,
          owner: "Emma Reynolds",
          expectedClose: "2026-11-30",
          venture: "Ace Consultancys",
          notes: "In final terms and contract review.",
        },
        {
          tenantId: tenantObjectId,
          createdBy: userObjectId,
          clientAccount: "Acme Corp",
          dealName: "Custom Analytics Engine",
          dealValue: 850000,
          stage: "Prospecting",
          probability: 50,
          owner: session.userName || "Admin",
          expectedClose: "2026-12-15",
          venture: "Ace Consultancys",
          notes: "Discovery call scheduled next week.",
        },
      ]);
    }

    // 2. Seed Clients
    const clientCount = await Client.countDocuments({ tenantId: tenantObjectId });
    if (clientCount === 0) {
      await Client.insertMany([
        {
          projectId: "CLP-001",
          clientAccount: "NovaWave LLC",
          venture: "Ace Consultancys",
          projectName: "Enterprise UI Design Retainer",
          deliveryOwner: session.userName,
          phase: "In Delivery",
          priority: "High",
          health: "Green",
          billingType: "Retainer",
          estHours: 40,
          actualHours: 28,
          progressPercent: 70,
          name: "NovaWave LLC",
          company: "NovaWave Inc.",
          email: "contact@novawave.de",
          phone: "+49 30 123456",
          status: "Active",
          retainerHours: 40,
          usedHours: 28,
          monthlyValue: 166244,
          notes: "Primary retainer account for enterprise UI design.",
          tenantId: tenantObjectId,
        },
        {
          projectId: "CLP-002",
          clientAccount: "Silver Hawk",
          venture: "Ace Consultancys",
          projectName: "Q4 Marketing & Growth",
          deliveryOwner: session.userName,
          phase: "In Delivery",
          priority: "Medium",
          health: "Green",
          billingType: "Project",
          estHours: 20,
          actualHours: 12,
          progressPercent: 60,
          name: "Silver Hawk",
          company: "Silver Hawk Media",
          email: "billing@silverhawk.au",
          phone: "+61 2 9876 5432",
          status: "Active",
          retainerHours: 20,
          usedHours: 12,
          monthlyValue: 128711,
          notes: "Growth campaigns in delivery.",
          tenantId: tenantObjectId,
        },
        {
          projectId: "CLP-003",
          clientAccount: "Summit LLC",
          venture: "Ace Consultancys",
          projectName: "Dedicated Backend Engineering",
          deliveryOwner: session.userName,
          phase: "In Delivery",
          priority: "High",
          health: "Green",
          billingType: "Retainer",
          estHours: 60,
          actualHours: 45,
          progressPercent: 75,
          name: "Summit LLC",
          company: "Summit Tech",
          email: "support@summit.it",
          phone: "+39 06 6987",
          status: "Active",
          retainerHours: 60,
          usedHours: 45,
          monthlyValue: 86365,
          notes: "Dedicated backend engineering retainer.",
          tenantId: tenantObjectId,
        }
      ]);
    }

    // 3. Seed Referrals
    const refCount = await Referral.countDocuments({ tenantId: tenantObjectId });
    if (refCount === 0) {
      await Referral.insertMany([
        {
          candidateName: "Sarah Connor",
          candidateEmail: "sarah.c@sky.net",
          phone: "+1 555-4433",
          position: "Senior React Developer",
          referrerName: session.userName,
          referrerId: userObjectId,
          status: "Interviewing",
          rewardAmount: 750,
          payoutStatus: "Pending",
          notes: "Passed technical screening with flying colors.",
          tenantId: tenantObjectId,
        },
        {
          candidateName: "David Miller",
          candidateEmail: "david.m@gmail.com",
          phone: "+1 555-8821",
          position: "Product Designer",
          referrerName: session.userName,
          referrerId: userObjectId,
          status: "Hired",
          rewardAmount: 500,
          payoutStatus: "Approved",
          notes: "Offer accepted! Joining next month.",
          tenantId: tenantObjectId,
        }
      ]);
    }

    // 4. Seed Chat Messages & Announcements
    const chatCount = await ChatMessage.countDocuments({ tenantId: tenantObjectId });
    if (chatCount === 0) {
      await ChatMessage.insertMany([
        {
          channel: "general",
          senderId: userObjectId,
          senderName: session.userName,
          senderRole: session.role,
          content: "Welcome to the NexAce Team Workspace! Feel free to ask any questions here.",
          isDM: false,
          tenantId: tenantObjectId,
        },
        {
          channel: "general",
          senderId: userObjectId,
          senderName: session.userName,
          senderRole: session.role,
          content: "Reminder: Sprint review is scheduled for 3:00 PM today.",
          isDM: false,
          tenantId: tenantObjectId,
        }
      ]);

      await Announcement.create({
        title: "Q3 Workspace Rollout Completed!",
        content: "All features including OKRs, Timesheets, and HR Portal are now live for all team members.",
        category: "Company News",
        authorName: session.userName,
        authorId: userObjectId,
        pinned: true,
        tenantId: tenantObjectId,
      });
    }

    return NextResponse.json({ message: "Demo data seeded successfully!" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
