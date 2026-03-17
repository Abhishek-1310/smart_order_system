// ============================================================
// Orders Page Component — View + Create Orders
// ============================================================

import React, { useEffect, useState } from 'react';
import { getOrders, createOrder } from '../services/api';
import { Order } from '../types';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Plus,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  X,
  Send,
  Database,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newQuantity, setNewQuantity] = useState('1');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

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
      setOrders([]);
      setDataSource('demo');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    toast.success('Orders refreshed');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newAmount);
    const quantity = parseInt(newQuantity);

    if (!newProductName.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > 999999.99) {
      toast.error('Amount exceeds maximum allowed value');
      return;
    }

    setCreating(true);
    try {
      const response = await createOrder({
        product_name: newProductName.trim(),
        quantity,
        description: newDescription.trim() || undefined,
        amount,
      });
      toast.success(`Order created! ID: ${response.data.orderId.slice(0, 8)}...`);
      setShowCreateModal(false);
      setNewAmount('');
      setNewProductName('');
      setNewQuantity('1');
      setNewDescription('');
      await fetchOrders();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create order';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner size="lg" text="Loading orders..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 mt-1">
            Manage and track your orders
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Data source badge */}
          {dataSource && (
            <div
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${dataSource === 'cache'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
            >
              {dataSource === 'cache' ? (
                <Zap className="w-3 h-3" />
              ) : (
                <Database className="w-3 h-3" />
              )}
              <span>
                {dataSource === 'cache'
                  ? 'From Cache'
                  : dataSource === 'database'
                    ? 'From Database'
                    : 'Demo Mode'}
              </span>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Order</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No orders yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Create your first order to see it processed through the serverless
            pipeline (SQS → Lambda → SNS).
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Create First Order</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Order ID</div>
            <div className="col-span-2">Product</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Created At</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-50">
            {orders.map((order, index) => (
              <div
                key={order.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="col-span-3 flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-mono font-medium text-gray-900">
                      #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {order.id.slice(8, 20)}...
                    </p>
                  </div>
                </div>
                <div className="col-span-2 flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.product_name}</p>
                    {order.description && (
                      <p className="text-xs text-gray-400">{order.description}</p>
                    )}
                  </div>
                </div>
                <div className="col-span-1 flex items-center">
                  <span className="text-sm text-gray-700">{order.quantity}</span>
                </div>
                <div className="col-span-2 flex items-center">
                  <span className="text-sm font-semibold text-gray-900">
                    ${order.amount.toFixed(2)}
                  </span>
                </div>
                <div className="col-span-2 flex items-center">
                  <StatusBadge status={order.status} />
                </div>
                <div className="col-span-2 flex items-center text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Table Footer */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
            Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ── Create Order Modal ──────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Create New Order
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. iPhone 15, Office Chair"
                  required
                  autoFocus
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="1"
                  required
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Amount ($) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999999.99"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Any additional details about this order..."
                  rows={2}
                />
              </div>

              {/* Flow explanation */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
                  What happens next
                </h4>
                <ol className="text-xs text-blue-600 space-y-1">
                  <li>1. Order saved to DynamoDB (status: PENDING)</li>
                  <li>2. Message sent to SQS for async processing</li>
                  <li>3. Worker Lambda processes payment</li>
                  <li>4. Status updated to COMPLETED</li>
                  <li>5. SNS sends email notification</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center space-x-2 py-2.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Create Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
