import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Client } from "@/models/Client";
import { Project } from "@/models/Project";
import mongoose from "mongoose";

/**
 * POST /api/operations/sync-projects
 * 1-to-1 two-way synchronization between Operations Control (Client retainers) and Projects & Kanban boards.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session || !session.userId || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tenantObjectId = new mongoose.Types.ObjectId(session.tenantId);
    const userObjectId = new mongoose.Types.ObjectId(session.userId);

    // 1. Fetch all clients and projects for this tenant
    const clients = await Client.find({ tenantId: tenantObjectId }).lean();
    const existingProjects = await Project.find({ tenantId: tenantObjectId }).lean();

    // Map existing projects by name (lowercase) and by clientId
    const projectByClientId = new Map<string, any>();
    const projectByName = new Map<string, any>();
    const existingProjectNames = new Set<string>();

    for (const p of existingProjects) {
      if (p.clientId) projectByClientId.set(p.clientId.toString(), p);
      if (p.name) {
        const lower = p.name.trim().toLowerCase();
        projectByName.set(lower, p);
        existingProjectNames.add(lower);
      }
    }

    // Determine name frequency among clients to know which need clientAccount prefix
    const nameFrequency: Record<string, number> = {};
    for (const c of clients) {
      const rawName = (c.projectName || "").trim() || "Project";
      nameFrequency[rawName.toLowerCase()] = (nameFrequency[rawName.toLowerCase()] || 0) + 1;
    }

    let createdProjectsCount = 0;

    // 2. Ensure EVERY Client in Operations Control has its own Kanban board
    for (const client of clients) {
      const clientIdStr = client._id.toString();

      // Check if already linked by clientId
      if (projectByClientId.has(clientIdStr)) {
        continue;
      }

      const rawName = (client.projectName || "").trim() || "Project";
      let boardName = rawName;

      // If multiple clients share the same project name (e.g. "Monthly Retainer"), disambiguate with clientAccount
      if (nameFrequency[rawName.toLowerCase()] > 1 && client.clientAccount) {
        boardName = `${client.clientAccount.trim()} - ${rawName}`;
      }

      // Check if an existing project with this exact name is not yet linked to any client
      let existingMatch = projectByName.get(boardName.toLowerCase());
      if (!existingMatch && projectByName.has(rawName.toLowerCase())) {
        const potential = projectByName.get(rawName.toLowerCase());
        if (!potential.clientId) {
          existingMatch = potential;
        }
      }

      if (existingMatch && !existingMatch.clientId) {
        // Link existing project to this client
        await Project.updateOne(
          { _id: existingMatch._id },
          { $set: { clientId: client._id, clientAccount: client.clientAccount } }
        );
        projectByClientId.set(clientIdStr, existingMatch);
        continue;
      }

      // If boardName is already taken by another project, add a unique suffix
      if (existingProjectNames.has(boardName.toLowerCase())) {
        boardName = `${boardName} (${client.clientAccount || client.projectId || clientIdStr.slice(-4)})`;
      }

      const projectStatus =
        client.phase === "In Delivery"
          ? "In Progress"
          : client.phase === "On Hold"
          ? "On Hold"
          : client.phase.includes("Closed")
          ? "Completed"
          : "Planning";

      const projectPriority =
        client.priority === "High" ? "High" : client.priority === "Low" ? "Low" : "Medium";

      const newProj = await Project.create({
        name: boardName,
        description: `Client: ${client.clientAccount || "Direct"} | Delivery Owner: ${client.deliveryOwner || "Unassigned"}`,
        status: projectStatus,
        priority: projectPriority,
        startDate: client.startDate || new Date(),
        dueDate: client.targetEndDate,
        cost: client.monthlyValue || 0,
        isInternal: false,
        assignType: "Member",
        members: [userObjectId],
        clientId: client._id,
        clientAccount: client.clientAccount,
        tenantId: tenantObjectId,
      });

      existingProjectNames.add(boardName.toLowerCase());
      projectByClientId.set(clientIdStr, newProj);
      projectByName.set(boardName.toLowerCase(), newProj);
      createdProjectsCount++;
    }

    // 3. Count updated totals
    const totalClients = await Client.countDocuments({ tenantId: tenantObjectId });
    const totalProjects = await Project.countDocuments({ tenantId: tenantObjectId });

    return NextResponse.json({
      success: true,
      message: `Synchronized ${createdProjectsCount} Kanban boards!`,
      createdProjectsCount,
      totalClients,
      totalProjects,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST sync-projects error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
