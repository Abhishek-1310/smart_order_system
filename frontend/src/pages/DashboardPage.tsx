// ============================================================
// Dashboard Page Component
// ============================================================

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrders } from '../services/api';
import { Order } from '../types';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ShoppingBag,
  DollarSign,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  Database,
  Zap,
  TrendingUp,
  Server,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await getOrders();
      setOrders(response.data.orders);
      setDataSource(response.data.source);
    } catch {
      // If API is not deployed yet, show empty state
      setOrders([]);
      setDataSource('demo');
    } finally {
      setLoading(false);
    }
  };

  // Compute stats
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED').length;
  const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
  const failedOrders = orders.filter((o) => o.status === 'FAILED').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + o.amount, 0);

  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.username}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here's an overview of your order activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {totalOrders}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                ${totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {completedOrders}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {pendingOrders}
              </p>
              {failedOrders > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  {failedOrders} failed
                </p>
              )}
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Orders
              </h2>
              <Link
                to="/orders"
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No orders yet</p>
                <Link
                  to="/orders"
                  className="inline-flex items-center space-x-1 mt-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create your first order</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.created_at).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-semibold text-gray-900">
                        ${order.amount.toFixed(2)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Architecture Info Panel */}
        <div className="space-y-6">
          {/* Data Source Indicator */}
          {dataSource && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Data Source
              </h3>
              <div
                className={`flex items-center space-x-2 p-3 rounded-lg ${
                  dataSource === 'cache'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-blue-50 text-blue-700'
                }`}
              >
                {dataSource === 'cache' ? (
                  <Zap className="w-5 h-5" />
                ) : (
                  <Database className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">
                  {dataSource === 'cache'
                    ? 'Served from Redis Cache ⚡'
                    : dataSource === 'database'
                    ? 'Fetched from RDS MySQL'
                    : 'Demo Mode (API not connected)'}
                </span>
              </div>
            </div>
          )}

          {/* Architecture Quick Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              System Architecture
            </h3>
            <div className="space-y-3">
              {[
                { icon: Server, label: 'API Gateway + Lambda', color: 'text-blue-600' },
                { icon: Database, label: 'RDS MySQL Database', color: 'text-purple-600' },
                { icon: Zap, label: 'ElastiCache Redis', color: 'text-orange-600' },
                { icon: TrendingUp, label: 'SQS + SNS Processing', color: 'text-green-600' },
              ].map(({ icon: Icon, label, color }) => (
                <div
                  key={label}
                  className="flex items-center space-x-3 text-sm text-gray-600"
                >
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
