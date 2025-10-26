"use client";

import { BottomNav } from "@/components/BottomNav";
import { Navbar } from "@/components/Navbar";
import { useAppStore } from "@/lib/store";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  totalAmount: number;
  itemCount: number;
  deliveryAddress: string;
  orderDate: string;
  estimatedDelivery?: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }[];
}

export default function OrdersPage() {
  const { user } = useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Mock data - replace with actual API call
  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock order data
      const mockOrders: Order[] = [
        {
          id: '1',
          orderNumber: 'OC-2024-001',
          status: 'delivered',
          totalAmount: 450.50,
          itemCount: 3,
          deliveryAddress: '123 Main St, City, State 12345',
          orderDate: '2024-01-15T10:30:00Z',
          estimatedDelivery: '2024-01-15T12:00:00Z',
          items: [
            { name: 'Fresh Bananas', quantity: 2, price: 25.00, imageUrl: '' },
            { name: 'Organic Milk 1L', quantity: 1, price: 45.00, imageUrl: '' },
            { name: 'Whole Wheat Bread', quantity: 1, price: 30.00, imageUrl: '' }
          ]
        },
        {
          id: '2',
          orderNumber: 'OC-2024-002',
          status: 'out_for_delivery',
          totalAmount: 320.75,
          itemCount: 2,
          deliveryAddress: '456 Oak Ave, City, State 12345',
          orderDate: '2024-01-16T14:20:00Z',
          estimatedDelivery: '2024-01-16T16:00:00Z',
          items: [
            { name: 'Fresh Apples', quantity: 1, price: 80.00, imageUrl: '' },
            { name: 'Greek Yogurt', quantity: 2, price: 120.00, imageUrl: '' }
          ]
        },
        {
          id: '3',
          orderNumber: 'OC-2024-003',
          status: 'preparing',
          totalAmount: 180.25,
          itemCount: 1,
          deliveryAddress: '789 Pine St, City, State 12345',
          orderDate: '2024-01-16T16:45:00Z',
          estimatedDelivery: '2024-01-16T18:30:00Z',
          items: [
            { name: 'Chicken Breast 500g', quantity: 1, price: 180.25, imageUrl: '' }
          ]
        }
      ];
      
      setOrders(mockOrders);
      setIsLoading(false);
    };

    fetchOrders();
  }, []);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'out_for_delivery':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = selectedStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === selectedStatus);

  const statusFilters = [
    { value: 'all', label: 'All Orders', count: orders.length },
    { value: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
    { value: 'preparing', label: 'Preparing', count: orders.filter(o => o.status === 'preparing').length },
    { value: 'out_for_delivery', label: 'Out for Delivery', count: orders.filter(o => o.status === 'out_for_delivery').length },
    { value: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered').length },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar showAddress={false} showCart={true} />

      {/* Main Content - Mobile design centered on desktop with white space */}
      <main className="max-w-md mx-auto px-4 py-6 pt-24 pb-24 border-x border-gray-200 min-h-screen bg-white">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-black mb-2">Order History</h1>
          <p className="text-sm text-gray-600">
            Track your orders and delivery status
          </p>
        </div>

        {/* Status Filters */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedStatus(filter.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedStatus === filter.value
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    selectedStatus === filter.value
                      ? 'bg-white/20'
                      : 'bg-gray-200'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-white border border-gray-200 rounded-lg animate-pulse">
                <div className="flex justify-between items-start mb-3">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedStatus === 'all' ? 'No orders yet' : `No ${selectedStatus} orders`}
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedStatus === 'all' 
                ? 'Start shopping to see your orders here'
                : `You don't have any ${selectedStatus} orders at the moment`
              }
            </p>
            {selectedStatus === 'all' && (
              <Link
                href="/search-items"
                className="inline-block bg-black text-white px-6 py-2 rounded-lg font-semibold text-sm hover:bg-gray-800 transition-colors"
              >
                Start Shopping
              </Link>
            )}
          </div>
        ) : (
          /* Orders List */
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                {/* Order Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {order.orderNumber}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {formatDate(order.orderDate)}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-600">
                      {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-600">
                      {order.deliveryAddress.length > 30 
                        ? order.deliveryAddress.substring(0, 30) + '...'
                        : order.deliveryAddress
                      }
                    </span>
                  </div>
                  
                  {/* Items List */}
                  <div className="space-y-1">
                    {order.items.slice(0, 2).map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-gray-900 font-medium">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-xs text-gray-500">
                        +{order.items.length - 2} more items
                      </p>
                    )}
                  </div>
                </div>

                {/* Order Footer */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{order.totalAmount.toFixed(2)}
                    </p>
                    {order.estimatedDelivery && order.status !== 'delivered' && (
                      <p className="text-xs text-gray-600">
                        Est. delivery: {formatDate(order.estimatedDelivery)}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="text-xs text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                      Track
                    </button>
                    {order.status === 'delivered' && (
                      <button className="text-xs text-blue-600 hover:text-blue-700 px-3 py-1 border border-blue-200 rounded-lg hover:border-blue-300 transition-colors">
                        Reorder
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {!isLoading && orders.length > 0 && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="flex gap-2">
              <Link
                href="/search-items"
                className="flex-1 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium text-center hover:bg-gray-800 transition-colors"
              >
                Order Again
              </Link>
              <button className="flex-1 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
                Contact Support
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
