"use client";

import { Navbar } from "@/components/Navbar";
import { useCheckoutCart } from "@/lib/cartStore";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const txHash = searchParams.get("txHash");
  const orderId = searchParams.get("orderId");
  const paymentId = searchParams.get("paymentId");

  const { selectedAddress } = useAppStore();
  const checkoutCart = useCheckoutCart();

  // Get ETA from checkout cart
  const eta = checkoutCart?.cart_data?.shipments?.[0]?.slot_details?.serviceability?.eta;
  const billDetails = checkoutCart?.cart_data?.bill_details;

  // Format ETA
  const formatETA = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} minutes`;
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar showCart={false} />

      <div className="pt-16 max-w-md mx-auto px-4 py-8 border-x border-gray-200 min-h-screen">
        {/* Success Icon */}
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Order Placed Successfully!
          </h1>
          <p className="text-sm text-gray-600 text-center">
            Your order has been confirmed and is being processed
          </p>
        </div>

        {/* ETA Card */}
        {eta && (
          <div className="bg-white border-2 border-gray-900 rounded-lg p-6 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Estimated Delivery</span>
              <span className="text-xs text-gray-500">ETA</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {formatETA(eta)}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="line-clamp-1">
                  {selectedAddress?.display_address || "Your delivery address"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Order Details */}
        {billDetails && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Order Summary
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Items</span>
                <span className="font-medium text-gray-900">
                  {billDetails.total_items}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-bold text-gray-900">
                  ₹{(billDetails.payable_amount || billDetails.bill_total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Details */}
        {(txHash || orderId || paymentId) && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Payment Details
            </h2>
            <div className="space-y-2 text-sm">
              {orderId && (
                <div>
                  <span className="text-gray-600">Order ID</span>
                  <p className="font-mono text-xs text-gray-900 mt-1 break-all">
                    {orderId}
                  </p>
                </div>
              )}
              {paymentId && (
                <div className="mt-3">
                  <span className="text-gray-600">Payment ID</span>
                  <p className="font-mono text-xs text-gray-900 mt-1 break-all">
                    {paymentId}
                  </p>
                </div>
              )}
              {txHash && (
                <div className="mt-3">
                  <span className="text-gray-600">Transaction Hash</span>
                  <p className="font-mono text-xs text-gray-900 mt-1 break-all">
                    {txHash}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 mt-6">
          <Link
            href="/search-items"
            className="block w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors text-center"
          >
            Continue Shopping
          </Link>
          
          {/* TODO: Add order tracking page */}
          {/* <Link
            href="/orders"
            className="block w-full px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
          >
            View My Orders
          </Link> */}
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Track Your Order
                </p>
                <p className="text-xs text-gray-600">
                  You will receive updates about your order status via notifications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

