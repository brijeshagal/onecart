'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAppStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first design with centered content and white space on desktop */}
      <main className="max-w-md mx-auto px-4 py-8 pt-16 pb-16 border-x border-gray-200 min-h-screen bg-white">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-black mb-2">OneCart</h1>
          <p className="text-sm text-gray-600">Smart Shopping Assistant</p>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-black mb-4">
            Seamless Address-Based Delivery
          </h2>
          <p className="text-sm text-gray-600 mb-8 leading-relaxed">
            Connect with nearby stores and get your groceries delivered to your doorstep. 
            Simple, fast, and reliable delivery from local stores.
          </p>

          <Link
            href="/register"
            className="inline-block w-full bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-semibold text-sm mb-4"
          >
            Create Your Account
          </Link>
          
          <p className="text-xs text-gray-500">
            Join thousands of users already shopping smarter
          </p>
        </div>

        {/* Features Section */}
        <div className="space-y-6 mb-12">
          <h3 className="text-lg font-semibold text-black text-center mb-6">
            Why Choose OneCart?
          </h3>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-black mb-1">Location-Based</h4>
                <p className="text-xs text-gray-600">
                  Find stores and delivery options based on your exact location
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-black mb-1">Local Stores</h4>
                <p className="text-xs text-gray-600">
                  Support local businesses and get fresh products from nearby stores
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-black mb-1">Fast Delivery</h4>
                <p className="text-xs text-gray-600">
                  Quick and reliable delivery from stores in your neighborhood
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-6 mb-12">
          <h3 className="text-lg font-semibold text-black text-center mb-6">
            How It Works
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              <p className="text-sm text-gray-700">Create your account and add delivery addresses</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                2
              </div>
              <p className="text-sm text-gray-700">Search for items from local stores</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <p className="text-sm text-gray-700">Add to cart and checkout securely</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                4
              </div>
              <p className="text-sm text-gray-700">Get your items delivered quickly</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link
            href="/register"
            className="inline-block w-full bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors font-semibold text-sm"
          >
            Get Started Now
          </Link>
          
          <p className="text-xs text-gray-500 mt-4">
            © 2024 OneCart. Connecting you with local stores.
          </p>
        </div>
      </main>
    </div>
  );
}
