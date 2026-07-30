import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { PulseSurvey } from "@/models/PulseSurvey";
import mongoose from "mongoose";

/**
 * GET: Fetch active Pulse Surveys & recent sentiment stats for tenant
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const tenantIdObj = new mongoose.Types.ObjectId(session.tenantId);

    // Auto-seed default Pulse survey if none exist
    let surveys = await PulseSurvey.find({ tenantId: tenantIdObj }).sort({ createdAt: -1 });

    if (surveys.length === 0) {
      const defaultSurvey = await PulseSurvey.create({
        question: "How supported and productive do you feel in your team this week?",
        category: "Morale",
        active: true,
        createdBy: new mongoose.Types.ObjectId(session.userId),
        tenantId: tenantIdObj,
        responses: [
          {
            userId: new mongoose.Types.ObjectId(session.userId),
            userName: session.userName,
            rating: 5,
            feedback: "Great sprint velocity and communication!",
            submittedAt: new Date(),
          },
        ],
      });
      surveys = [defaultSurvey];
    }

    // Format surveys so employee responses are aggregated cleanly
    const formattedSurveys = surveys.map((survey) => {
      const responses = survey.responses || [];
      const totalResponses = responses.length;
      const avgRating =
        totalResponses > 0
          ? Math.round((responses.reduce((acc, r) => acc + r.rating, 0) / totalResponses) * 10) / 10
          : 0;

      const userResponse = responses.find((r) => r.userId.toString() === session.userId);

      return {
        _id: survey._id,
        question: survey.question,
        category: survey.category,
        active: survey.active,
        totalResponses,
        avgRating,
        userHasResponded: Boolean(userResponse),
        userRating: userResponse?.rating,
        userFeedback: userResponse?.feedback,
        createdAt: survey.createdAt,
      };
    });

    return NextResponse.json({ surveys: formattedSurveys });
  } catch (error: any) {
    console.error("API GET PulseSurveys error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST: Submit response to a survey OR create a new Pulse Survey (Admin/Manager)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await connectToDatabase();

    // Mode A: Creating new Pulse Survey
    if (body.action === "create_survey") {
      if (session.role !== "Admin" && session.role !== "Manager") {
        return NextResponse.json({ error: "Only Managers and Admins can launch Pulse Surveys" }, { status: 403 });
      }

      if (!body.question) {
        return NextResponse.json({ error: "Survey question is required" }, { status: 400 });
      }

      const newSurvey = await PulseSurvey.create({
        question: body.question,
        category: body.category || "Morale",
        active: true,
        createdBy: new mongoose.Types.ObjectId(session.userId),
        tenantId: new mongoose.Types.ObjectId(session.tenantId),
        responses: [],
      });

      return NextResponse.json({ success: true, survey: newSurvey }, { status: 201 });
    }

    // Mode B: Submitting rating response to active survey
    const { surveyId, rating, feedback } = body;
    if (!surveyId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Valid survey ID and 1-5 rating score required" }, { status: 400 });
    }

    const survey = await PulseSurvey.findOne({
      _id: surveyId,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Prevent duplicate responses from same user
    const existingIdx = survey.responses.findIndex((r) => r.userId.toString() === session.userId);
    if (existingIdx >= 0) {
      survey.responses[existingIdx].rating = rating;
      if (feedback !== undefined) survey.responses[existingIdx].feedback = feedback;
      survey.responses[existingIdx].submittedAt = new Date();
    } else {
      survey.responses.push({
        userId: new mongoose.Types.ObjectId(session.userId),
        userName: session.userName,
        rating,
        feedback: feedback || "",
        submittedAt: new Date(),
      });
    }

    await survey.save();
    return NextResponse.json({ success: true, message: "Response recorded! Thank you for your feedback." });
  } catch (error: any) {
    console.error("API POST PulseSurveys error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
