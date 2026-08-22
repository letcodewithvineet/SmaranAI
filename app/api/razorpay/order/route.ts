import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { z } from "zod";

const planAmounts = {
  Standard: 799,
  Gold: 999,
} as const;

const orderSchema = z.object({
  planType: z.enum(["Standard", "Gold"]),
  amount: z.union([z.literal(799), z.literal(999)]),
  recordId: z.string().regex(/^[a-f\d]{24}$/i),
});

export async function POST(request: Request) {
  try {
    const payload = orderSchema.parse(await request.json());
    const expectedAmount = planAmounts[payload.planType];

    if (payload.amount !== expectedAmount) {
      return NextResponse.json(
        {
          error: `${payload.planType} plan amount must be ₹${expectedAmount}.`,
        },
        { status: 400 },
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          error:
            "Razorpay test keys are not configured. Add NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local.",
        },
        { status: 500 },
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    const amountInPaise = payload.amount * 100;
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `virasatai_${payload.planType.toLowerCase()}_${Date.now()}`,
      notes: {
        planType: payload.planType,
        recordId: payload.recordId,
        product: "VirasatAI Membership",
      },
    });

    if (!order.id) {
      return NextResponse.json(
        { error: "Razorpay did not return an order ID." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      orderId: order.id,
      amount: amountInPaise,
      currency: "INR",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error:
            "Invalid request. Use planType 'Standard' with amount 799 or planType 'Gold' with amount 999.",
        },
        { status: 400 },
      );
    }

    console.error("Razorpay order creation failed", error);

    return NextResponse.json(
      { error: "Unable to create Razorpay order. Please try again." },
      { status: 500 },
    );
  }
}
