"use client";

import { Navbar } from "@/components/Navbar";
import { useRazorpay } from "@/hooks/useRazorpay";
import { apiService } from "@/lib/api";
import { useCart, useCartActions, useCheckoutCart } from "@/lib/cartStore";
import { useAppStore } from "@/lib/store";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Abi } from "viem";
import { useAccount } from "wagmi";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, selectedAddress } = useAppStore();
  const cart = useCart();
  const checkoutCart = useCheckoutCart();
  const { fetchCartCheckoutDetails } = useCartActions();
  const { isLoaded: isRazorpayLoaded, openRazorpay } = useRazorpay();
  const { address: account, isConnected } = useAccount();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_paymentMethod, setPaymentMethod] = useState<"razorpay" | "crypto">(
    "crypto"
  );

  // Fetch checkout cart details on page load
  useEffect(() => {
    if (user?.id && cart?.cartId && selectedAddress) {
      console.log("📦 Fetching checkout cart details...");
      fetchCartCheckoutDetails(user.id, selectedAddress);
    }
  }, [user?.id, cart?.cartId, selectedAddress, fetchCartCheckoutDetails]);

  // Calculate totals
  const billDetails = checkoutCart?.cart_data?.bill_details;
  const amount = billDetails?.payable_amount || billDetails?.bill_total || 0;
  const totalItems = cart?.totalItems || 0;

  // Currency conversion: 1 USD = 88 INR
  const USD_TO_INR = 88;
  const amountUSD = amount / USD_TO_INR;

  const handlePayment = async () => {
    if (!user?.id || !cart?.cartId || !selectedAddress) {
      router.push(
        `/payment-failed?error=${encodeURIComponent(
          "Missing required information. Please go back to cart."
        )}&method=razorpay`
      );
      return;
    }

    if (!isRazorpayLoaded) {
      router.push(
        `/payment-failed?error=${encodeURIComponent(
          "Payment gateway is loading. Please wait and try again."
        )}&method=razorpay`
      );
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create Razorpay order
      const orderResponse = await apiService.createRazorpayOrder(
        amount,
        cart.cartId
      );

      if (!orderResponse.success || !orderResponse.data) {
        throw new Error(
          orderResponse.error?.toString() || "Failed to create payment order"
        );
      }

      const { orderId } = orderResponse.data;

      // Open Razorpay payment modal
      openRazorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: orderResponse.data.amount, // Amount in paise
        currency: orderResponse.data.currency || "INR",
        name: "OneCart",
        description: `Payment for ${totalItems} items`,
        order_id: orderId,
        handler: async function (response) {
          // Payment successful, verify the payment
          console.log("✅ Payment successful:", response);

          try {
            const verifyResponse = await apiService.verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );

            if (verifyResponse.success) {
              // Payment verified successfully
              console.log("✅ Payment verified successfully");

              // TODO: Create order in database
              // TODO: Clear cart

              // Navigate to order success page
              router.push(
                `/order-success?orderId=${response.razorpay_order_id}&paymentId=${response.razorpay_payment_id}`
              );
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (verifyError) {
            console.error("❌ Payment verification error:", verifyError);
            const errorMsg = `Payment received but verification failed. Please contact support.\nPayment ID: ${response.razorpay_payment_id}`;
            
            // Redirect to payment failed page
            router.push(
              `/payment-failed?error=${encodeURIComponent(errorMsg)}&method=razorpay`
            );
            setIsProcessing(false);
          }
        },
        prefill: {
          name: user.username || "",
          email: user.email || "",
          contact: user.phone || "",
        },
        notes: {
          cartId: cart.cartId,
          userId: user.id,
          address: selectedAddress.display_address,
        },
        theme: {
          color: "#000000", // Black theme matching your app
        },
        modal: {
          ondismiss: function () {
            console.log("Payment modal closed by user");
            setIsProcessing(false);
            
            // Redirect to payment failed page when user cancels
            router.push(
              `/payment-failed?error=${encodeURIComponent(
                "Payment was cancelled. Your cart is still active."
              )}&method=razorpay`
            );
          },
        },
      });
    } catch (error) {
      console.error("❌ Payment initiation error:", error);
      const errorMsg = `Failed to initiate payment: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      
      // Redirect to payment failed page
      router.push(
        `/payment-failed?error=${encodeURIComponent(errorMsg)}&method=razorpay`
      );
      setIsProcessing(false);
    }
  };

  // Handle crypto payment
  const handleCryptoPayment = async () => {
    if (!isConnected) {
      router.push(
        `/payment-failed?error=${encodeURIComponent(
          "Please connect your wallet first to pay with crypto."
        )}&method=crypto`
      );
      return;
    }

    if (!user?.id || !cart?.cartId || !selectedAddress || !account) {
      router.push(
        `/payment-failed?error=${encodeURIComponent(
          "Missing required information. Please go back to cart."
        )}&method=crypto`
      );
      return;
    }

    setIsProcessing(true);
    setError(null);
    setPaymentMethod("crypto");

    try {
      // Step 1: Add/verify wallet address in backend
      console.log("🔐 Verifying wallet address...");
      const walletResponse = await apiService.addWalletAddress(
        user.id,
        account
      );

      if (!walletResponse.success) {
        throw new Error("Failed to verify wallet address");
      }

      console.log(
        `✅ Wallet ${walletResponse.data?.isNew ? "added" : "verified"}: ${account}`
      );

      // Step 2: Send transaction
      console.log("💸 Sending transaction...");
      
      // Dynamic import to avoid server-side issues
      const { createWalletClient, createPublicClient, http, parseUnits, erc20Abi } = await import("viem");
      const { baseSepolia } = await import("viem/chains");
      
      const walletClient = createWalletClient({
        chain: baseSepolia,
        transport: http(),
      });
      const hash = await walletClient.writeContract({
        account,
        address: "0x5dEaC602762362FE5f135FA5904351916053cF70",
        abi: erc20Abi as Abi,
        functionName: "transfer",
        args: [
          "0x62414d44AaE1aA532630eDa14Df7F449C475759C",
          parseUnits(amount.toString(), 18) as bigint,
        ],
      });

      console.log("⏳ Waiting for transaction confirmation...");
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(),
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ Transaction receipt:", receipt);

      if (receipt.status === "success") {
        // Step 3: Verify transaction on backend
        console.log("🔐 Verifying transaction on backend...");
        const verifyResponse = await apiService.verifyCryptoPayment(
          user.id,
          hash,
          amount
        );

        if (!verifyResponse.success) {
          throw new Error(
            "Transaction completed but verification failed. Please contact support."
          );
        }

        console.log("✅ Transaction verified successfully on backend");

        // TODO: Create order in database
        // TODO: Clear cart

        // Navigate to order success page
        router.push(`/order-success?txHash=${hash}`);
      } else {
        // Transaction failed on blockchain
        const errorMsg = "Transaction failed on blockchain. Please try again.";
        router.push(
          `/payment-failed?error=${encodeURIComponent(errorMsg)}&method=crypto`
        );
      }
    } catch (error) {
      console.error("❌ Crypto payment error:", error);
      const errorMsg = `Failed to complete crypto payment: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      
      // Redirect to payment failed page
      router.push(
        `/payment-failed?error=${encodeURIComponent(errorMsg)}&method=crypto`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user || !cart || !selectedAddress) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar showCart={false} />

      <div className="pt-16 max-w-md mx-auto px-4 py-8 border-x border-gray-200 min-h-screen">
        {/* Header with Total */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
            {!billDetails ? (
              /* Loading Skeleton */
              <div className="text-right animate-pulse">
                <div className="h-7 bg-gray-200 rounded w-24 mb-1"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ) : (
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">
                  ₹{amount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  ${amountUSD.toFixed(2)} USD
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">Review and complete payment</p>
        </div>

        {/* Delivery Address */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Delivery Address
            </h2>
            <Link
              href="/cart"
              className="text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Change
            </Link>
          </div>
          {!selectedAddress ? (
            /* Loading Skeleton */
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ) : (
            <div className="text-sm">
              {selectedAddress.label && (
                <p className="font-medium text-gray-900 mb-1">
                  {selectedAddress.label}
                </p>
              )}
              <p className="text-gray-600">{selectedAddress.display_address}</p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-white border-2 border-gray-900 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Payment Error
                </p>
                <p className="text-sm text-gray-600 whitespace-pre-line">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && !error && (
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Processing Payment
                </p>
                <p className="text-xs text-gray-600">
                  Please do not close this window...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Razorpay */}
        {!isRazorpayLoaded && (
          <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Loading Payment Gateway
                </p>
                <p className="text-xs text-gray-600">Please wait...</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Choose Payment Method
          </h2>

          <div className="space-y-3">
            {/* Razorpay Payment Option */}
            <button
              onClick={() => {
                setPaymentMethod("razorpay");
                handlePayment();
              }}
              disabled={!isRazorpayLoaded || isProcessing}
              className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between"
            >
              <span>Pay with Razorpay</span>
              <span className="text-xs">Card, UPI, NetBanking</span>
            </button>

            {/* Crypto Payment Option */}
            <div className="w-full">
              {isConnected ? (
                <button
                  onClick={handleCryptoPayment}
                  disabled={isProcessing || !billDetails}
                  className="w-full px-6 py-3 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left flex items-center justify-between"
                >
                  <span>Pay with Crypto</span>
                  {billDetails && (
                    <div className="text-right">
                      <div className="text-xs font-medium">
                        ${amountUSD.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {amountUSD.toFixed(2)} USDC
                      </div>
                    </div>
                  )}
                </button>
              ) : (
                <div className="w-full">
                  <ConnectButton.Custom>
                    {({ openConnectModal }) => (
                      <button
                        onClick={openConnectModal}
                        className="w-full px-6 py-3 bg-white text-gray-900 border-2 border-gray-900 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-left flex items-center justify-between"
                      >
                        <span>Connect Wallet to Pay</span>
                        <span className="text-xs">Base Sepolia</span>
                      </button>
                    )}
                  </ConnectButton.Custom>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wallet Connection Status */}
        {isConnected && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Connected Wallet</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-900">
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </span>
                <ConnectButton.Custom>
                  {({ openAccountModal }) => (
                    <button
                      onClick={openAccountModal}
                      className="text-xs text-gray-600 hover:text-gray-900 underline"
                    >
                      Change
                    </button>
                  )}
                </ConnectButton.Custom>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Order Summary
          </h2>

          {!billDetails ? (
            /* Loading Skeleton */
            <div className="space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="flex justify-between items-center">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Items</span>
                <span className="font-medium text-gray-900">{totalItems}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal</span>
                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    ₹{(billDetails.total_cost || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ${((billDetails.total_cost || 0) / USD_TO_INR).toFixed(2)}
                  </div>
                </div>
              </div>

              {(billDetails.delivery_charge || 0) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Delivery Fee</span>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      ₹{(billDetails.delivery_charge || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      $
                      {(
                        (billDetails.delivery_charge || 0) / USD_TO_INR
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {billDetails.product_discount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Discount</span>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      -₹{billDetails.product_discount.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      -${(billDetails.product_discount / USD_TO_INR).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-6">
          <Link
            href="/cart"
            className="block w-full px-6 py-3 bg-white text-gray-900 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
          >
            ← Back to Cart
          </Link>
        </div>

        {/* Security Badge */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Secure payment powered by Razorpay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
