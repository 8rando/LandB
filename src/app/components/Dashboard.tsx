import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Package, AlertTriangle, DollarSign, TrendingUp, Activity, Calendar } from 'lucide-react';
import { format, subDays, subMonths, subYears, startOfDay, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth } from 'date-fns';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const { products, invoices, activities, settings } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '1year'>('7days');

  const stats = useMemo(() => {
    const totalProducts = products.reduce((sum, p) => sum + p.quantity, 0);
    const lowStockCount = products.filter(p => p.quantity <= settings.lowStockThreshold).length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalProfit = invoices.reduce((sum, inv) => {
      return sum + inv.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          return itemSum + (item.price - product.cost) * item.quantity;
        }
        return itemSum;
      }, 0);
    }, 0);

    return { totalProducts, lowStockCount, totalRevenue, totalProfit };
  }, [products, invoices, settings.lowStockThreshold]);

  const lowStockProducts = useMemo(
    () => products.filter(p => p.quantity <= settings.lowStockThreshold),
    [products, settings.lowStockThreshold]
  );

  const recentActivities = activities.slice(0, 10);

  const salesData = useMemo(() => {
    const end = new Date();
    let intervals: Date[] = [];
    let formatStr = 'MMM dd';

    if (dateRange === '7days') {
      intervals = eachDayOfInterval({ start: subDays(end, 6), end });
    } else if (dateRange === '30days') {
      intervals = eachDayOfInterval({ start: subDays(end, 29), end });
      // For 30 days, we'll group by week to avoid too many bars, or just show fewer ticks
    } else if (dateRange === '1year') {
      intervals = eachMonthOfInterval({ start: subMonths(end, 11), end });
      formatStr = 'MMM yy';
    }

    return intervals.map(date => {
      let rangeStart, rangeEnd;
      if (dateRange === '1year') {
        rangeStart = startOfMonth(date);
        rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        rangeStart = startOfDay(date);
        rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate(), 23, 59, 59, 999);
      }

      const rangeInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= rangeStart && invDate <= rangeEnd;
      });

      return {
        id: date.getTime().toString(),
        date: format(date, formatStr),
        sales: rangeInvoices.reduce((sum, inv) => sum + inv.total, 0),
        invoices: rangeInvoices.length,
      };
    });
  }, [invoices, dateRange]);

  const itemTypeData = useMemo(() => {
    const counts = products.reduce((acc, p) => {
      acc[p.itemType] = (acc[p.itemType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value], index) => ({ id: `type-${index}-${name}`, name, value }));
  }, [products]);

  const COLORS: Record<string, string> = {
    Inventory: '#3b82f6',
    'Non-Inventory': '#64748b',
    Service: '#10b981',
    Bundle: '#f97316',
    Other: '#9ca3af',
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.username}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <button
          onClick={() => user?.role === 'admin' && navigate('/inventory')}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-left hover:shadow-md hover:border-blue-300 transition-all cursor-pointer disabled:cursor-default disabled:hover:shadow-sm disabled:hover:border-gray-200"
          disabled={user?.role !== 'admin'}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Stock</p>
              <p className="text-3xl">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">{products.length} product types</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          {user?.role === 'admin' && (
            <p className="text-xs text-blue-600 mt-3">Click to view inventory →</p>
          )}
        </button>

        <button
          onClick={() => user?.role === 'admin' && navigate('/inventory')}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-left hover:shadow-md hover:border-orange-300 transition-all cursor-pointer disabled:cursor-default disabled:hover:shadow-sm disabled:hover:border-gray-200"
          disabled={user?.role !== 'admin'}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Low Stock Alerts</p>
              <p className="text-3xl text-orange-600">{stats.lowStockCount}</p>
              <p className="text-xs text-gray-500 mt-1">Needs reordering</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          {user?.role === 'admin' && (
            <p className="text-xs text-orange-600 mt-3">Click to manage stock →</p>
          )}
        </button>

        <button
          onClick={() => navigate('/invoices')}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-left hover:shadow-md hover:border-green-300 transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{invoices.length} invoices</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-green-600 mt-3">Click to view invoices →</p>
        </button>

        <button
          onClick={() => navigate('/invoices')}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 text-left hover:shadow-md hover:border-yellow-300 transition-all cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Profit</p>
              <p className="text-3xl">${stats.totalProfit.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Gross margin</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-xs text-yellow-600 mt-3">Click to view invoices →</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              Historical Sales
            </h2>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="1year">Last 12 Months</option>
            </select>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData} key={`bar-chart-${dateRange}`}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" key="grid" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  fontSize={12} 
                  key="xaxis"
                  minTickGap={20}
                />
                <YAxis stroke="#6b7280" fontSize={12} key="yaxis" />
                <Tooltip
                  key="tooltip"
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Sales']}
                />
                <Bar dataKey="sales" fill="#eab308" radius={[8, 8, 0, 0]} key="bar" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2>Items by Type</h2>
          </div>
          <div className="p-6">
            {itemTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart key={`pie-chart-${itemTypeData.length}`}>
                  <Pie
                    key="pie"
                    data={itemTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                  >
                    {itemTypeData.map(entry => (
                      <Cell key={entry.id} fill={COLORS[entry.name] || '#9ca3af'} />
                    ))}
                  </Pie>
                  <Tooltip
                    key="tooltip"
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                    }}
                    formatter={(value: number, name: string) => [value + ' items', name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No items data available
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Low Stock Alerts
            </h2>
            {user?.role === 'admin' && lowStockProducts.length > 0 && (
              <button
                onClick={() => navigate('/inventory')}
                className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
              >
                View All →
              </button>
            )}
          </div>
          <div className="p-6">
            {lowStockProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No low stock items</p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map(product => (
                  <button
                    key={product.id}
                    onClick={() => user?.role === 'admin' && navigate('/inventory')}
                    className="w-full flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors text-left disabled:cursor-default disabled:hover:bg-orange-50"
                    disabled={user?.role !== 'admin'}
                  >
                    <div>
                      <p className="text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.sku || product.itemType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-700">
                        {product.quantity} {product.unit}
                      </p>
                      <p className="text-xs text-gray-500">Min: {product.minStock}</p>
                    </div>
                  </button>
                ))}
                {lowStockProducts.length > 5 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    +{lowStockProducts.length - 5} more items
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-yellow-600" />
              Recent Activity
            </h2>
          </div>
          <div className="p-6">
            {recentActivities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map(activity => (
                  <div key={activity.id} className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
                        {activity.user && ` • ${activity.user}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
