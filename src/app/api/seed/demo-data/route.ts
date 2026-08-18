import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models/Client";
import { Referral } from "@/models/Referral";
import { ChatMessage } from "@/models/ChatMessage";
import { Announcement } from "@/models/Announcement";
import { DriveFile } from "@/models/DriveFile";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function POST() {
  try {
    const authResult = await requireTenantSession(["Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    await connectToDatabase();

    // 1. Seed Clients
    const clientCount = await Client.countDocuments({ tenantId: tenantObjectId });
    if (clientCount === 0) {
      await Client.insertMany([
        {
          projectId: "CLP-001",
          clientAccount: "Acme Corporation",
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
          name: "Acme Corporation",
          company: "Acme Inc.",
          email: "contact@acme.com",
          phone: "+1 555-0192",
          status: "Active",
          retainerHours: 40,
          usedHours: 28,
          monthlyValue: 3500,
          notes: "Primary retainer account for enterprise UI design.",
          tenantId: tenantObjectId,
        },
        {
          projectId: "CLP-002",
          clientAccount: "Starlight Media",
          venture: "Ace Consultancys",
          projectName: "Q4 Marketing Campaigns",
          deliveryOwner: session.userName,
          phase: "In Delivery",
          priority: "Medium",
          health: "Amber",
          billingType: "Project",
          estHours: 20,
          actualHours: 0,
          progressPercent: 10,
          name: "Starlight Media",
          company: "Starlight Ltd",
          email: "billing@starlight.io",
          phone: "+1 555-0811",
          status: "Lead",
          retainerHours: 20,
          usedHours: 0,
          monthlyValue: 1800,
          notes: "Prospecting for Q4 digital marketing campaigns.",
          tenantId: tenantObjectId,
        },
        {
          projectId: "CLP-003",
          clientAccount: "Nexus Labs",
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
          name: "Nexus Labs",
          company: "Nexus Tech",
          email: "support@nexuslabs.com",
          phone: "+1 555-9922",
          status: "Active",
          retainerHours: 60,
          usedHours: 45,
          monthlyValue: 5000,
          notes: "Dedicated backend engineering retainer.",
          tenantId: tenantObjectId,
        }
      ]);
    }

    // 2. Seed Referrals
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

    // 3. Seed Chat Messages & Announcements
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

    return NextResponse.json({ message: "Seed completed successfully!" });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
