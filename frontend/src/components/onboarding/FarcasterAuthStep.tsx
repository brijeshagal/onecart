"use client";

import { Button } from "@/components/ui/Button";
import { SignInButton, useProfile, useSignIn } from "@farcaster/auth-kit";
import "@farcaster/auth-kit/styles.css";
import Image from "next/image";

interface FarcasterAuthStepProps {
  onComplete: (data: {
    profile: any;
    walletAddresses: Array<{ address: string; verified: boolean; id: string }>;
  }) => void;
  onBack?: () => void;
}

export const FarcasterAuthStep: React.FC<FarcasterAuthStepProps> = ({
  onComplete,
  onBack,
}) => {
  const { isAuthenticated, profile } = useProfile();
  const { signOut } = useSignIn({});

  // Get verified wallet addresses from profile
  const getVerifiedWallets = () => {
    if (!profile?.verifications) return [];
    
    return profile.verifications.map((verification: string, index: number) => ({
      address: verification,
      verified: true,
      id: `verified-${index}`,
    }));
  };

  const handleContinue = () => {
    if (isAuthenticated && profile) {
      const verifiedWallets = getVerifiedWallets();
      
      // Check if user has at least one verified wallet
      if (verifiedWallets.length > 0) {
        onComplete({
          profile,
          walletAddresses: verifiedWallets,
        });
      }
    }
  };

  const verifiedWallets = getVerifiedWallets();
  const canContinue = isAuthenticated && profile && verifiedWallets.length > 0;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Your Account
        </h2>
        <p className="text-gray-600">
          Sign in with Farcaster to use your verified wallet addresses
        </p>
      </div>

      {/* Farcaster Connection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Farcaster Sign-In (Required)*
        </label>

        {isAuthenticated && profile ? (
          // Connected State
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              {profile?.pfpUrl ? (
                <span className="text-white text-sm font-bold w-8 h-8 rounded-full">
                  <Image
                    src={profile?.pfpUrl ?? ""}
                    alt="Farcaster"
                    className="w-full h-full rounded-full"
                    width={32}
                    height={32}
                    onError={(e) => {
                      // Fallback to username initial if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class="text-gray-400 text-sm font-bold">${
                          profile?.username?.charAt(0) || "F"
                        }</span>`;
                        parent.className =
                          "text-white text-sm font-bold w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center";
                      }
                    }}
                  />
                </span>
              ) : (
                <span className="text-gray-400 text-sm font-bold w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  {profile?.username?.charAt(0) || "F"}
                </span>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  @{profile?.username}
                </p>
                <p className="text-xs text-gray-500">FID: {profile?.fid}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <SignInButton />
        )}
      </div>

      {/* Verified Wallets */}
      {isAuthenticated && profile && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Verified Wallets
          </label>

          {verifiedWallets.length > 0 ? (
            <div className="space-y-2">
              {verifiedWallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </p>
                      <p className="text-xs text-green-600">Verified by Farcaster</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <p className="text-sm text-yellow-800">
                  No verified wallets found. Please verify a wallet address in your Farcaster profile.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        {onBack && (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="px-6"
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="px-6"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
