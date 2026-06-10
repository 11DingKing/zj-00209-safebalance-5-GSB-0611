import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { vehiclesAPI } from '../api';
import { getScoreColor, getScoreBg, getStatusBadge } from '../components/Layout';
import RadarChart from '../components/RadarChart';

function VehicleDetail() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicle();
  }, [id]);

  const loadVehicle = async () => {
    setLoading(true);
    try {
      const res = await vehiclesAPI.getById(id);
      setVehicle(res.data);
    } catch (error) {
      console.error('加载车型详情失败:', error);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-gray-500 mb-4">车型不存在</div>
        <Link to="/vehicles" className="text-blue-600 hover:text-blue-800">
          ← 返回列表
        </Link>
      </div>
    );
  }

  const metricCards = [
    {
      label: '整备质量',
      value: `${vehicle.curb_weight} kg`,
      sublabel: vehicle.weight_class,
      score: vehicle.weight_score,
      color: 'from-blue-500 to-cyan-500',
      icon: '⚖️',
    },
    {
      label: '百公里制动',
      value: `${vehicle.braking_distance} m`,
      sublabel: '制动距离越短越好',
      score: vehicle.evasion_score,
      color: 'from-red-500 to-orange-500',
      icon: '🛑',
    },
    {
      label: '百公里能耗',
      value: `${vehicle.energy_consumption}`,
      sublabel: '能耗越低越经济',
      score: vehicle.energy_score,
      color: 'from-green-500 to-emerald-500',
      icon: '⚡',
    },
    {
      label: '续航里程',
      value: `${vehicle.range} km`,
      sublabel: '单次续航能力',
      color: 'from-purple-500 to-pink-500',
      icon: '🔋',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/vehicles" className="text-gray-500 hover:text-gray-700">
          ← 返回列表
        </Link>
        {getStatusBadge(vehicle.status)}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="text-gray-500 mt-1">
              {vehicle.vehicle_class} · {vehicle.weight_class}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">综合权衡分</div>
              <div className={`text-4xl font-bold ${getScoreColor(vehicle.total_score)}`}>
                {vehicle.total_score?.toFixed(1)}
              </div>
            </div>
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="6"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke={vehicle.total_score >= 70 ? '#10b981' : vehicle.total_score >= 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="6"
                  strokeDasharray={`${(vehicle.total_score / 100) * 176} 176`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl mb-1">{card.icon}</div>
                <div className="text-sm text-gray-500">{card.label}</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">
                  {card.value}
                </div>
                <div className="text-xs text-gray-400 mt-1">{card.sublabel}</div>
              </div>
              {card.score !== undefined && (
                <div className={`text-2xl font-bold ${getScoreColor(card.score)}`}>
                  {card.score.toFixed(0)}
                </div>
              )}
            </div>
            {card.score !== undefined && (
              <div className="mt-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${card.color} transition-all duration-500`}
                    style={{ width: `${card.score}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">三项雷达图</h3>
          <RadarChart vehicle={vehicle} height={350} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">详细评分</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">轻量化得分</span>
                <span className={`font-bold ${getScoreColor(vehicle.weight_score)}`}>
                  {vehicle.weight_score?.toFixed(1)}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${vehicle.weight_score}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                基于整备质量 {vehicle.curb_weight}kg 计算，越轻得分越高
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">避险能力</span>
                <span className={`font-bold ${getScoreColor(vehicle.evasion_score)}`}>
                  {vehicle.evasion_score?.toFixed(1)}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${vehicle.evasion_score}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                基于百公里制动 {vehicle.braking_distance}m 计算，距离越短得分越高（权重最高40%）
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">能耗经济性</span>
                <span className={`font-bold ${getScoreColor(vehicle.energy_score)}`}>
                  {vehicle.energy_score?.toFixed(1)}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${vehicle.energy_score}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                基于百公里能耗 {vehicle.energy_consumption} 计算，能耗越低得分越高
              </p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-900">综合权衡分</span>
                <span className={`text-2xl font-bold ${getScoreColor(vehicle.total_score)}`}>
                  {vehicle.total_score?.toFixed(1)}
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getScoreBg(vehicle.total_score)} transition-all duration-500`}
                  style={{ width: `${vehicle.total_score}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                加权公式：轻量化 × 35% + 避险 × 40% + 能耗 × 25%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VehicleDetail;
