"use client";

import { AddressModal } from "@/components/AddressModal";
import { BottomNav } from "@/components/BottomNav";
import { Navbar } from "@/components/Navbar";
import { useAppStore } from "@/lib/store";
import { useCartStore } from "@/lib/cartStore";
import { getCurrentLocation } from "@/lib/location";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { user, selectedAddress, setSelectedAddress } = useAppStore();
  const { cart } = useCartStore();
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Get current location on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        const result = await getCurrentLocation();
        if (result.coordinates.lat && result.coordinates.lng) {
          setCurrentLocation(result.coordinates);
        }
      } catch (error) {
        console.error("Failed to get current location:", error);
      }
    };

    initialize();
  }, []);

  const quickActions = [
    {
      title: "Search Items",
      description: "Find products from local stores",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      href: "/search-items",
      color: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-600",
    },
    {
      title: "My Cart",
      description: `${cart?.totalItems || 0} items`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      href: "/cart",
      color: "bg-green-50 border-green-200",
      iconColor: "text-green-600",
    },
    {
      title: "My Addresses",
      description: `${user?.addresses?.length || 0} saved`,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      href: "#",
      color: "bg-purple-50 border-purple-200",
      iconColor: "text-purple-600",
      onClick: () => setIsAddressModalOpen(true),
    },
    {
      title: "Order History",
      description: "View past orders",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      href: "/orders",
      color: "bg-orange-50 border-orange-200",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar
        showAddress={true}
        showCart={true}
        selectedAddress={selectedAddress?.display_address}
        addressLabel={selectedAddress?.name}
        onAddressClick={() => setIsAddressModalOpen(true)}
      />

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelect={(address) => {
          setSelectedAddress(address);
        }}
        savedAddresses={user?.addresses || []}
        currentLocation={currentLocation || undefined}
      />

      {/* Main Content - Mobile design centered on desktop with white space */}
      <main className="max-w-md mx-auto px-4 py-6 pt-24 pb-24 border-x border-gray-200 min-h-screen bg-white">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-black mb-2">
            Welcome back{user?.username ? `, ${user.username}` : ''}!
          </h1>
          <p className="text-sm text-gray-600">
            Ready to shop from local stores?
          </p>
        </div>

        {/* Current Address */}
        {selectedAddress ? (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">📍</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Delivery Address
                </h3>
                <p className="text-sm text-gray-600 mb-0.5">
                  {selectedAddress.label && (
                    <span className="font-medium text-gray-900">
                      {selectedAddress.label}
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedAddress.display_address}
                </p>
              </div>
              <button
                onClick={() => setIsAddressModalOpen(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">⚠️</span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  No Delivery Address Selected
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Please select a delivery address to start shopping
                </p>
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Select Address
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-black mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const content = (
                <div className={`p-4 rounded-lg border ${action.color} hover:shadow-sm transition-shadow`}>
                  <div className={`w-10 h-10 ${action.iconColor} rounded-lg flex items-center justify-center mb-3`}>
                    {action.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {action.description}
                  </p>
                </div>
              );

              if (action.onClick) {
                return (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className="text-left"
                  >
                    {content}
                  </button>
                );
              }

              return (
                <Link key={index} href={action.href} className="text-left">
                  {content}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-black mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {cart && cart.totalItems > 0 ? (
              <div className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {cart.totalItems} items in your cart
                    </p>
                    <p className="text-xs text-gray-600">
                      Ready to checkout
                    </p>
                  </div>
                  <Link
                    href="/cart"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600 mb-2">No recent activity</p>
                <Link
                  href="/search-items"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Start shopping
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-black mb-4">Your Stats</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-white border border-gray-200 rounded-lg text-center">
              <p className="text-2xl font-bold text-black mb-1">
                {user?.addresses?.length || 0}
              </p>
              <p className="text-xs text-gray-600">Saved Addresses</p>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-lg text-center">
              <p className="text-2xl font-bold text-black mb-1">
                {cart?.totalItems || 0}
              </p>
              <p className="text-xs text-gray-600">Cart Items</p>
            </div>
          </div>
        </div>

        {/* Get Started */}
        {(!selectedAddress || (cart?.totalItems || 0) === 0) && (
          <div className="text-center">
            <div className="p-6 bg-black rounded-lg text-white">
              <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
              <p className="text-sm text-gray-300 mb-4">
                {!selectedAddress 
                  ? "Select a delivery address to start shopping"
                  : "Search for items and add them to your cart"
                }
              </p>
              <Link
                href={!selectedAddress ? "#" : "/search-items"}
                onClick={!selectedAddress ? () => setIsAddressModalOpen(true) : undefined}
                className="inline-block bg-white text-black px-6 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
              >
                {!selectedAddress ? "Select Address" : "Start Shopping"}
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
