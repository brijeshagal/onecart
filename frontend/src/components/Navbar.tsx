"use client";

import { useAppStore } from "@/lib/store";
import { useCart } from "@/lib/cartStore";
import Link from "next/link";

interface NavbarProps {
  showAddress?: boolean;
  selectedAddress?: string;
  addressLabel?: string;
  onAddressClick?: () => void;
  showCart?: boolean;
}

export function Navbar({
  showAddress = false,
  selectedAddress,
  addressLabel,
  onAddressClick,
  showCart = false,
}: NavbarProps) {
  const { user } = useAppStore();
  const cart = useCart();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white z-50">
      <div className="max-w-md mx-auto border-x border-b border-gray-200">
        {/* Main navbar - Mobile design centered on desktop */}
        <div className="px-4 py-2 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">O</span>
            </div>
            <span className="font-bold text-black text-base">
              OneCart
            </span>
          </Link>

          {/* Right side: Cart + User Avatar */}
          <div className="flex items-center gap-2">
            {/* Cart Icon with Badge */}
            {showCart && (
              <Link href="/cart" className="relative shrink-0">
                <div className="w-7 h-7 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {cart && cart.totalItems > 0 && (
                    <div className="absolute -top-1 -right-1 bg-black text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                      {cart.totalItems > 9 ? '9+' : cart.totalItems}
                    </div>
                  )}
                </div>
              </Link>
            )}

            {/* User Avatar */}
            {user && (
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-gray-700">
                  {user.username?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Address bar - Mobile design centered on desktop */}
        {showAddress && (
          <div className="px-4 pb-2">
            <button
              onClick={onAddressClick}
              className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:border-black transition-colors bg-gray-50"
            >
              <span className="text-xs text-gray-900 shrink-0">📍</span>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1">
                  {addressLabel && (
                    <span className="font-medium text-gray-900 text-xs">
                      {addressLabel}
                    </span>
                  )}
                  {addressLabel && selectedAddress && (
                    <span className="text-gray-400">·</span>
                  )}
                  {selectedAddress && (
                    <span className="text-gray-600 text-xs truncate">
                      {selectedAddress.length > 30
                        ? selectedAddress.substring(0, 30) + "..."
                        : selectedAddress}
                    </span>
                  )}
                  {!selectedAddress && !addressLabel && (
                    <span className="text-gray-500 text-xs">Select delivery address</span>
                  )}
                </div>
              </div>
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
