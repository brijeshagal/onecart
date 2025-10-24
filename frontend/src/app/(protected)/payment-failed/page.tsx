"use client";

import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

// Force dynamic rendering since this page uses search params
export const dynamic = "force-dynamic";

function PaymentFailedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [errorMessage, setErrorMessage] = useState("Payment failed. Please try again.");
  const [paymentMethod, setPaymentMethod] = useState("payment");

  // Get error details from URL params only on client side after mount
  useEffect(() => {
    if (searchParams) {
      setErrorMessage(searchParams.get("error") || "Payment failed. Please try again.");
      setPaymentMethod(searchParams.get("method") || "payment");
    }
  }, [searchParams]);

  // Countdown and auto-redirect
  useEffect(() => {
    if (countdown <= 0) {
      router.push("/cart");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar showCart={false} />

      <div className="pt-16 max-w-md mx-auto px-4 py-8 border-x border-gray-200 min-h-screen">
        {/* Error Icon */}
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Payment Failed
          </h1>
          <p className="text-sm text-gray-600 text-center mb-4">
            We couldn&apos;t process your payment
          </p>
        </div>

        {/* Error Details */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                What went wrong?
              </p>
              <p className="text-sm text-gray-600 whitespace-pre-line">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Method Info */}
        {paymentMethod && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium text-gray-900 capitalize">
                {paymentMethod}
              </span>
            </div>
          </div>
        )}

        {/* Auto-redirect Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-4 border-blue-200 flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">
                  {countdown}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                Redirecting to Cart
              </p>
              <p className="text-xs text-gray-600">
                You will be automatically redirected in {countdown} second{countdown !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Troubleshooting Tips */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Troubleshooting Tips
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">•</span>
              <p className="text-gray-600">
                Check if your wallet has sufficient balance
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">•</span>
              <p className="text-gray-600">
                Ensure you&apos;re connected to the correct network (Base Sepolia)
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">•</span>
              <p className="text-gray-600">
                Verify your payment method details are correct
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">•</span>
              <p className="text-gray-600">
                Try a different payment method if the issue persists
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/cart"
            className="block w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center"
          >
            Return to Cart
          </Link>
          
          <Link
            href="/search-items"
            className="block w-full px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Support Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Need help with your payment?
            </p>
            <p className="text-xs text-gray-500">
              Contact support if you continue experiencing issues
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Navbar showCart={false} />
        <div className="pt-16 max-w-md mx-auto px-4 py-8 border-x border-gray-200 min-h-screen">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    }>
      <PaymentFailedContent />
    </Suspense>
  );
}

