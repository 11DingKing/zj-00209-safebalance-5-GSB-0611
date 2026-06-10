import { Outlet, NavLink, useLocation } from "react-router-dom";

const navItems = [
  { path: "/vehicles", label: "权衡排行", icon: "📊" },
  { path: "/tradeoff", label: "权衡曲线", icon: "📈" },
  { path: "/compare", label: "情景对比", icon: "⚖️" },
  { path: "/manage", label: "车型管理", icon: "🔧" },
  { path: "/review", label: "审核管理", icon: "✅" },
];

const statusColors = {
  draft: "bg-gray-100 text-gray-600",
  calculated: "bg-yellow-100 text-yellow-700",
  pending_review: "bg-orange-100 text-orange-700",
  published: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const statusLabels = {
  draft: "草稿",
  calculated: "测算完成",
  pending_review: "待审核",
  published: "已发布",
  rejected: "已拒绝",
};

export const getStatusBadge = (status) => {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || "bg-gray-100"}`}
    >
      {statusLabels[status] || status}
    </span>
  );
};

export const getScoreColor = (score) => {
  if (score >= 70) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-600";
};

export const getScoreBg = (score) => {
  if (score >= 70) return "bg-green-500";
  if (score >= 50) return "bg-yellow-500";
  return "bg-red-500";
};

function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SafeBalance</h1>
                <p className="text-xs text-gray-500">
                  车重 · 避险 · 能耗 权衡评估平台
                </p>
              </div>
            </div>
            <nav className="flex space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2
                    ${
                      location.pathname.startsWith(item.path)
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            SafeBalance 车重权衡评估平台 © 2026 | 数据仅供参考
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
