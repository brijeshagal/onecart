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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-black">OneCart</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link
                href="/register"
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-black mb-6">
            Seamless Address-Based Delivery
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with nearby stores and get your groceries delivered to your doorstep.
            Simple, fast, and reliable delivery from local stores.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/register"
              className="bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-colors font-semibold text-lg"
            >
              Create Your Account
            </Link>
            <button className="text-gray-600 hover:text-black transition-colors font-medium">
              Learn More →
            </button>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-black mb-4">
              Why Choose OneCart?
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Experience the future of local delivery with our innovative platform
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-black mb-2">Location-Based</h4>
              <p className="text-gray-600">
                Find stores and delivery options based on your exact location
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-black mb-2">Local Stores</h4>
              <p className="text-gray-600">
                Support local businesses and get fresh products from nearby stores
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="text-xl font-semibold text-black mb-2">Fast Delivery</h4>
              <p className="text-gray-600">
                Quick and reliable delivery from stores in your neighborhood
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-500">
              © 2024 OneCart. Connecting you with local stores.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
