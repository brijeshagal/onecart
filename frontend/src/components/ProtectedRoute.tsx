"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * ProtectedRoute - Wrapper component for route protection
 * Redirects unauthenticated users to registration page
 */
export function ProtectedRoute({
  children,
  requireAuth = true,
  redirectTo = "/register",
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAppStore();

  useEffect(() => {
    if (requireAuth && !isLoading && !isAuthenticated) {
      console.log("🚫 Unauthorized access - redirecting to:", redirectTo);
      router.push(redirectTo);
    }
  }, [requireAuth, isAuthenticated, isLoading, router, redirectTo]);

  // Show loading state while checking authentication
  if (requireAuth && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (requireAuth && !isAuthenticated && !user) {
    return null;
  }

  return <>{children}</>;
}

