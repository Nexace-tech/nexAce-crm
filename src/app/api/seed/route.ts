import { NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Wiki } from "@/models/Wiki";
import { DriveFile } from "@/models/DriveFile";
import { Sprint } from "@/models/Sprint";
import { Event } from "@/models/Event";
import { TimeEntry } from "@/models/TimeEntry";
import { Attendance } from "@/models/Attendance";

export async function GET() {
  // Only allow seeding in development environment
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    await connectToDatabase();

    // 1. Clear existing database collections
    await User.deleteMany({});
    await Tenant.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Wiki.deleteMany({});
    await DriveFile.deleteMany({});
    await Sprint.deleteMany({});
    await Event.deleteMany({});
    await TimeEntry.deleteMany({});
    await Attendance.deleteMany({});

    // 2. Create Tenant
    const tenant = await Tenant.create({
      name: "Acme Corp",
      slug: "acme-corp",
    });

    const tenantId = tenant._id as mongoose.Types.ObjectId;

    // 3. Hash password
    const hashedPassword = await bcrypt.hash("password123", 10);

    // 4. Create CEO / Admin
    const ceo = await User.create({
      name: "John Doe",
      email: "admin@nex.com",
      passwordHash: hashedPassword,
      role: "Admin",
      tenantId,
      department: "Management",
      bio: "CEO & Co-founder. Overseeing overall strategic direction.",
      phone: "+1-555-0100",
      photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      skills: ["Leadership", "Strategy", "Fundraising", "Business Development"],
    });

    const ceoId = ceo._id as mongoose.Types.ObjectId;

    // 5. Create Managers (report to CEO)
    const engManager = await User.create({
      name: "Sarah Jenkins",
      email: "sarah@acme.com",
      passwordHash: hashedPassword,
      role: "Manager",
      tenantId,
      department: "Engineering",
      managerId: ceoId,
      bio: "VP of Engineering. Hailing from MIT, loves scalable architectures and clean code.",
      phone: "+1-555-0120",
      photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
      skills: ["Node.js", "System Architecture", "MongoDB", "TypeScript", "Scalability"],
    });

    const designManager = await User.create({
      name: "Marcus Wu",
      email: "marcus@acme.com",
      passwordHash: hashedPassword,
      role: "Manager",
      tenantId,
      department: "Design",
      managerId: ceoId,
      bio: "Creative Director. Passionate about glassmorphism, responsive designs, and dark aesthetics.",
      phone: "+1-555-0130",
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      skills: ["Figma", "UX/UI Design", "Branding", "Motion Graphics"],
    });

    const engManagerId = engManager._id as mongoose.Types.ObjectId;
    const designManagerId = designManager._id as mongoose.Types.ObjectId;

    // 6. Create Employees (report to Managers)
    const david = await User.create({
      name: "David Miller",
      email: "david@acme.com",
      passwordHash: hashedPassword,
      role: "Employee",
      tenantId,
      department: "Engineering",
      managerId: engManagerId,
      bio: "Senior Software Engineer. Focuses on Next.js backend API optimizations and routing.",
      phone: "+1-555-0121",
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
      skills: ["Next.js", "React", "TypeScript", "REST APIs", "SQL"],
    });

    const elena = await User.create({
      name: "Elena Rostova",
      email: "elena@acme.com",
      passwordHash: hashedPassword,
      role: "Employee",
      tenantId,
      department: "Engineering",
      managerId: engManagerId,
      bio: "Frontend Developer. Enjoys building micro-interactions and smooth scroll timelines.",
      phone: "+1-555-0122",
      photoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      skills: ["CSS Variables", "HTML5 Canvas", "React", "Webpack", "Tailwind"],
    });

    const chloe = await User.create({
      name: "Chloe Sterling",
      email: "chloe@acme.com",
      passwordHash: hashedPassword,
      role: "Employee",
      tenantId,
      department: "Design",
      managerId: designManagerId,
      bio: "Junior UI Designer. Focused on layout hierarchy and vector typography illustrations.",
      phone: "+1-555-0131",
      photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
      skills: ["Figma", "Illustrator", "Typography", "Prototyping"],
    });

    const rajesh = await User.create({
      name: "Rajesh Kumar",
      email: "rajesh@acme.com",
      passwordHash: hashedPassword,
      role: "Employee",
      tenantId,
      department: "Marketing",
      managerId: ceoId,
      bio: "Marketing Specialist. Organizes campaigns and tracks retainer performance goals.",
      phone: "+1-555-0140",
      photoUrl: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=150&h=150&fit=crop&crop=face",
      skills: ["SEO", "Copywriting", "Campaign Analysis", "A/B Testing"],
    });

    const davidId = david._id as mongoose.Types.ObjectId;
    const elenaId = elena._id as mongoose.Types.ObjectId;
    const chloeId = chloe._id as mongoose.Types.ObjectId;
    const rajeshId = rajesh._id as mongoose.Types.ObjectId;

    // 7. Seed Projects
    const projCrm = await Project.create({
      name: "NexAce CRM Implementation",
      description: "Implementing core unified Multi-tenant workspace features.",
      status: "In Progress",
      members: [ceoId, engManagerId, designManagerId, davidId, elenaId, chloeId],
      tenantId,
    });

    const projPortal = await Project.create({
      name: "Client Portal Integration",
      description: "Developing guest portals and client feedback retainer trackers.",
      status: "Planning",
      members: [ceoId, engManagerId, davidId],
      tenantId,
    });

    // 8. Seed Sprints
    const sprint1 = await Sprint.create({
      name: "Sprint 1 - Core Modules",
      goal: "Implement Auth, directory, timesheets, and Kanban views",
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
      status: "Active",
      tenantId,
    });

    const sprint2 = await Sprint.create({
      name: "Sprint 2 - Integrations",
      goal: "Implement Wiki SOP, file upload explorer, and email notifications",
      startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // starts in 8 days
      endDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000), // lasts 14 days
      status: "Planned",
      tenantId,
    });

    // 9. Seed Tasks
    await Task.create([
      {
        title: "Design Glassmorphism Dashboard Layout",
        description: "Draft Figma prototype panels highlighting translucent cards and neon glow accents.",
        projectId: projCrm._id,
        sprintId: sprint1._id,
        assignee: chloeId,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // completed 2 days ago
        priority: "High",
        status: "Done",
        subtasks: [
          { title: "Define variable style sheets", completed: true },
          { title: "Review typography scales", completed: true },
        ],
        comments: [
          { userId: designManagerId, userName: "Marcus Wu", content: "Translucent borders look excellent!", createdAt: new Date() },
        ],
        tenantId,
      },
      {
        title: "Code Next.js API Routes for Projects",
        description: "Implement GET/POST project workspaces and tasks details endpoints.",
        projectId: projCrm._id,
        sprintId: sprint1._id,
        assignee: davidId,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        priority: "High",
        status: "In Progress",
        subtasks: [
          { title: "Write model schemas", completed: true },
          { title: "Setup dynamic ID routing lookup", completed: false },
        ],
        tenantId,
      },
      {
        title: "Implement Kanban Board Drag-and-Drop",
        description: "Connect native HTML5 draggable props to React states calling re-route updates.",
        projectId: projCrm._id,
        sprintId: sprint1._id,
        assignee: elenaId,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        priority: "High",
        status: "Review",
        subtasks: [
          { title: "Define onDragOver triggers", completed: true },
          { title: "Test column bounds layout", completed: false },
        ],
        tenantId,
      },
      {
        title: "Create Brand Strategy Wiki Article",
        description: "Document target client retainers communication protocols.",
        projectId: projPortal._id,
        assignee: rajeshId,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        priority: "Medium",
        status: "To Do",
        subtasks: [],
        tenantId,
      },
    ]);

    // 10. Seed Wiki SOP Articles
    await Wiki.create([
      {
        title: "Acme Corp Brand Guidelines",
        content: `Welcome to Acme Corp! Our branding values consistency, cool-slate dark shades, and high responsiveness.
- Accent color: Indigo (#6366F1)
- Cards panel styling: Glassmorphic borders with 10px backdrop filters.
- Voice tone: Clean, tech-forward, and unified.`,
        createdBy: ceoId,
        tenantId,
      },
      {
        title: "Git Workflow SOP",
        content: `Engineering code submissions protocols:
1. Branch off main using format: feat/name or bugfix/name.
2. Ensure lint checks compile clean locally.
3. Open PR; requires at least 1 Manager review sign-off before main merge.`,
        createdBy: engManagerId,
        tenantId,
      },
    ]);

    // 11. Seed Calendar Events
    await Event.create([
      {
        title: "Acme Weekly All Hands",
        description: "Status reviews on target retainer velocity objectives.",
        type: "Meeting",
        startDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // starts in 2 hours
        endDate: new Date(Date.now() + 3 * 60 * 60 * 1000), // lasts 1 hour
        department: "All",
        userId: ceoId,
        tenantId,
      },
      {
        title: "Sprint Review Call",
        description: "Checking completed task status for Sprint 1.",
        type: "Meeting",
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
        department: "Engineering",
        userId: engManagerId,
        tenantId,
      },
      {
        title: "Independence Day Holiday",
        description: "Official company holiday, offices closed.",
        type: "Holiday",
        startDate: new Date("2026-07-04T00:00:00.000Z"),
        endDate: new Date("2026-07-04T23:59:59.999Z"),
        department: "All",
        userId: ceoId,
        tenantId,
      },
    ]);

    // 12. Seed Timesheets Logged Hours (David & Elena)
    const todayMidnight = new Date();
    todayMidnight.setHours(0,0,0,0);

    const monDate = new Date(todayMidnight);
    monDate.setDate(monDate.getDate() - (monDate.getDay() === 0 ? 6 : monDate.getDay() - 1)); // This Monday

    const tueDate = new Date(monDate);
    tueDate.setDate(tueDate.getDate() + 1); // This Tuesday

    await TimeEntry.create([
      {
        userId: davidId,
        project: "NexAce CRM Implementation",
        taskName: "API endpoints CRUD handlers",
        hours: 8,
        date: monDate,
        isBillable: true,
        status: "Approved",
        approvedBy: engManagerId,
        tenantId,
      },
      {
        userId: elenaId,
        project: "NexAce CRM Implementation",
        taskName: "HTML5 drag triggers",
        hours: 6,
        date: tueDate,
        isBillable: true,
        status: "Pending",
        tenantId,
      },
    ]);

    // 13. Seed Attendance checkin logs today
    await Attendance.create([
      {
        userId: davidId,
        date: todayMidnight,
        clockIn: new Date(new Date(todayMidnight).setHours(9, 2, 0)), // Clocked in at 9:02 AM
        status: "Present",
        tenantId,
      },
      {
        userId: elenaId,
        date: todayMidnight,
        clockIn: new Date(new Date(todayMidnight).setHours(9, 15, 0)), // Clocked in at 9:15 AM
        clockOut: new Date(new Date(todayMidnight).setHours(17, 30, 0)), // Clocked out at 5:30 PM
        status: "Present",
        tenantId,
      },
    ]);

    return NextResponse.json({
      message: "Database fully seeded with Projects, Sprints, Kanban Tasks, Wiki SOPs, Timesheets, and Events!",
      tenant: tenant.name,
      usersCreated: 7,
      projectsCreated: 2,
      sprintsCreated: 2,
      tasksCreated: 4,
    });
  } catch (error: unknown) {
    console.error("Database seed error:", error);
    return NextResponse.json({ error: (error instanceof Error ? error.message : "Internal Server Error") || "Failed to seed database" }, { status: 500 });
  }
}
