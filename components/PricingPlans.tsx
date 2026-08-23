"use client";

import Script from "next/script";
import { CheckCircle2, Crown, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Component, type ReactNode, useState } from "react";

export type MembershipPlan = "Basic" | "Standard" | "Gold";

type PaidPlan = Extract<MembershipPlan, "Standard" | "Gold">;

type PricingPlansProps = {
  activePlan: MembershipPlan;
  activeRecordId?: string;
  onPaymentSuccess: (plan: PaidPlan, paymentId: string) => void;
};

type PricingPlansErrorBoundaryState = {
  hasError: boolean;
};

type RazorpayOrderResponse = {
  orderId: string;
  amount: number;
  currency: "INR";
  error?: string;
};

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayVerifyResponse = {
  verified?: boolean;
  paymentId?: string;
  error?: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill: {
    name: string;
    email: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
};

type RazorpayCheckout = {
  open: () => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

const paidPlans: Array<{
  name: PaidPlan;
  amount: 799 | 999;
  title: string;
  badge?: string;
  description: string;
  features: string[];
}> = [
  {
    name: "Standard",
    amount: 799,
    title: "Standard Plan",
    description: "For families creating richer tribute cards and multilingual memories.",
    features: [
      "Up to 5 profiles",
      "High-res PDF tribute cards",
      "Multilingual bio generation",
    ],
  },
  {
    name: "Gold",
    amount: 999,
    title: "Gold Plan",
    badge: "Best value",
    description: "For complete heritage archives with full creative access.",
    features: [
      "Unlimited profiles",
      "Interactive AI Memory Vault Q&A",
      "Audio ingestion",
      "Priority AI processing",
    ],
  },
];

export default function PricingPlans({
  activePlan,
  activeRecordId,
  onPaymentSuccess,
}: PricingPlansProps) {
  return (
    <PricingPlansErrorBoundary>
      <PricingPlansContent
        activePlan={activePlan}
        activeRecordId={activeRecordId}
        onPaymentSuccess={onPaymentSuccess}
      />
    </PricingPlansErrorBoundary>
  );
}

class PricingPlansErrorBoundary extends Component<
  { children: ReactNode },
  PricingPlansErrorBoundaryState
> {
  state: PricingPlansErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
          Membership checkout could not be loaded. Please refresh and try again.
        </div>
      );
    }

    return this.props.children;
  }
}

function PricingPlansContent({
  activePlan,
  activeRecordId,
  onPaymentSuccess,
}: PricingPlansProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<PaidPlan | null>(null);
  const [error, setError] = useState("");

  async function handlePayment(planName: PaidPlan, amount: 799 | 999) {
    setError("");

    if (!scriptReady || !window.Razorpay) {
      setError("Razorpay checkout is still loading. Please try again in a moment.");
      return;
    }

    if (!activeRecordId) {
      setError("Select or save a memorial record before upgrading its membership.");
      return;
    }

    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      setError("Razorpay public key is missing in NEXT_PUBLIC_RAZORPAY_KEY_ID.");
      return;
    }

    setLoadingPlan(planName);

    try {
      const response = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: planName,
          amount,
          recordId: activeRecordId,
        }),
      });
      const data = (await response.json()) as RazorpayOrderResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create payment order.");
      }

      const checkout = new window.Razorpay({
        key,
        amount: data.amount,
        currency: data.currency,
        name: "SmaranAI",
        description: `${planName} Membership`,
        order_id: data.orderId,
        handler: async (payment) => {
          try {
            const verifyResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                planType: planName,
                recordId: activeRecordId,
                razorpayPaymentId: payment.razorpay_payment_id,
                razorpayOrderId: payment.razorpay_order_id,
                razorpaySignature: payment.razorpay_signature,
              }),
            });
            const verifyData =
              (await verifyResponse.json()) as RazorpayVerifyResponse;

            if (!verifyResponse.ok || !verifyData.verified) {
              throw new Error(
                verifyData.error ?? "Payment verification failed.",
              );
            }

            setLoadingPlan(null);
            onPaymentSuccess(
              planName,
              verifyData.paymentId ?? payment.razorpay_payment_id,
            );
            alert(
              `${planName} membership activated. Payment ID: ${verifyData.paymentId ?? payment.razorpay_payment_id}`,
            );
          } catch (verifyError) {
            setError(
              verifyError instanceof Error
                ? verifyError.message
                : "Payment verification failed.",
            );
            setLoadingPlan(null);
          }
        },
        prefill: {
          name: "SmaranAI Member",
          email: "test@example.com",
        },
        theme: {
          color: "#9b7436",
        },
        modal: {
          ondismiss: () => setLoadingPlan(null),
        },
      });

      checkout.open();
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Payment could not be started.",
      );
      setLoadingPlan(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("Unable to load Razorpay checkout script.")}
      />

      <div className="grid gap-3">
        {paidPlans.map((plan) => {
          const isGold = plan.name === "Gold";
          const isActive = activePlan === plan.name;
          const isLoading = loadingPlan === plan.name;

          return (
            <div
              className={cn(
                "rounded-md border bg-card p-4",
                isGold
                  ? "border-[#b9934a] bg-[#fff8e5]"
                  : "border-border",
              )}
              key={plan.name}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words font-serif text-xl font-semibold">
                      {plan.title}
                    </h3>
                    {plan.badge ? (
                      <span className="rounded-md bg-[#9b7436] px-2 py-1 text-xs font-bold text-white">
                        {plan.badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                {isGold ? (
                  <Crown className="h-5 w-5 shrink-0 text-[#9b7436]" />
                ) : (
                  <Sparkles className="h-5 w-5 shrink-0 text-[#9b7436]" />
                )}
              </div>

              <p className="mt-4 font-serif text-3xl font-semibold">
                ₹{plan.amount}
              </p>

              <div className="mt-4 grid gap-2">
                {plan.features.map((feature) => (
                  <div
                    className="flex items-start gap-2 text-sm leading-6"
                    key={feature}
                  >
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#7a693f]" />
                    <span className="break-words">{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className="mt-5 w-full"
                disabled={isActive || Boolean(loadingPlan) || !activeRecordId}
                onClick={() => void handlePayment(plan.name, plan.amount)}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {isActive
                  ? "Active plan"
                  : activeRecordId
                    ? `Pay ₹${plan.amount}`
                    : "Select record first"}
              </Button>
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
          {error}
        </div>
      ) : null}
      {!activeRecordId ? (
        <div className="rounded-md border border-[#d7b66c]/60 bg-[#fff8e5] px-3 py-2 text-sm leading-6 text-[#5f461d]">
          Membership upgrades are applied to one saved memorial record at a time.
        </div>
      ) : null}
    </div>
  );
}
