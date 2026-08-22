import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { updateMemorialMembership } from "@/lib/mongodb";

const verifySchema = z.object({
  planType: z.enum(["Standard", "Gold"]),
  recordId: z.string().regex(/^[a-f\d]{24}$/i),
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = verifySchema.parse(await request.json());
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay key secret is not configured." },
        { status: 500 },
      );
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== payload.razorpaySignature) {
      return NextResponse.json(
        { error: "Payment verification failed." },
        { status: 400 },
      );
    }

    const record = await updateMemorialMembership(payload.recordId, {
      plan: payload.planType,
      paymentId: payload.razorpayPaymentId,
      orderId: payload.razorpayOrderId,
      provider: "razorpay",
    });

    if (!record) {
      return NextResponse.json(
        { error: "Payment verified, but the memorial record was not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      verified: true,
      planType: payload.planType,
      paymentId: payload.razorpayPaymentId,
      record,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payment verification payload." },
        { status: 400 },
      );
    }

    console.error("Razorpay payment verification failed", error);

    return NextResponse.json(
      { error: "Unable to verify Razorpay payment." },
      { status: 500 },
    );
  }
}
