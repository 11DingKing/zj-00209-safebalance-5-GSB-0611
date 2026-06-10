import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { vehiclesAPI } from "../api";
import {
  getScoreColor,
  getScoreBg,
  getStatusBadge,
} from "../components/Layout";
import RadarChart from "../components/RadarChart";
import WeightSlider from "../components/WeightSlider";

const DEFAULT_WEIGHTS = { weight: 0.35, evasion: 0.4, energy: 0.25 };

function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [weightClasses, setWeightClasses] = useState([]);
  const [vehicleClasses, setVehicleClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    vehicle_class: "",
    weight_class: "",
    sort_by: "total_score",
    sort_order: "desc",
  });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [weightsApplied, setWeightsApplied] = useState(DEFAULT_WEIGHTS);
  const [recalculating, setRecalculating] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      recalculateWithWeights();
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [weights]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, classesRes, vClassesRes] = await Promise.all([
        vehiclesAPI.getAll({ ...filters, status: "published" }),
        vehiclesAPI.getWeightClasses(),
        vehiclesAPI.getVehicleClasses(),
      ]);
      let vehiclesData = vehiclesRes.data;

      const isDefaultWeights =
        Math.abs(weights.weight - DEFAULT_WEIGHTS.weight) < 0.001 &&
        Math.abs(weights.evasion - DEFAULT_WEIGHTS.evasion) < 0.001 &&
        Math.abs(weights.energy - DEFAULT_WEIGHTS.energy) < 0.001;

      if (!isDefaultWeights && weights !== weightsApplied) {
        const recalcRes = await vehiclesAPI.recalculateWithWeights(weights);
        vehiclesData = recalcRes.data.vehicles;
        setWeightsApplied(recalcRes.data.weights_applied);
      }

      setVehicles(vehiclesData);
      setWeightClasses(classesRes.data);
      setVehicleClasses(vClassesRes.data);
      if (vehiclesData.length > 0 && !selectedVehicle) {
        setSelectedVehicle(vehiclesData[0]);
      }
    } catch (error) {
      console.error("加载数据失败:", error);
    }
    setLoading(false);
  };

  const recalculateWithWeights = async () => {
    setRecalculating(true);
    try {
      const res = await vehiclesAPI.recalculateWithWeights(weights);
      let vehiclesData = res.data.vehicles;

      if (filters.vehicle_class) {
        vehiclesData = vehiclesData.filter(
          (v) => v.vehicle_class === filters.vehicle_class,
        );
      }
      if (filters.weight_class) {
        vehiclesData = vehiclesData.filter(
          (v) => v.weight_class === filters.weight_class,
        );
      }

      if (filters.sort_by && filters.sort_order) {
        vehiclesData.sort((a, b) => {
          const aVal = a[filters.sort_by];
          const bVal = b[filters.sort_by];
          return filters.sort_order === "desc" ? bVal - aVal : aVal - bVal;
        });
      }

      setVehicles(vehiclesData);
      setWeightsApplied(res.data.weights_applied);

      if (vehiclesData.length > 0) {
        const currentSelected = vehiclesData.find(
          (v) => v.id === selectedVehicle?.id,
        );
        if (currentSelected) {
          setSelectedVehicle(currentSelected);
        } else {
          setSelectedVehicle(vehiclesData[0]);
        }
      }
    } catch (error) {
      console.error("权重计算失败:", error);
    }
    setRecalculating(false);
  };

  const handleWeightsChange = (newWeights) => {
    setWeights(newWeights);
  };

  const handleResetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const getRankBadge = (index) => {
    const colors = [
      "bg-yellow-500 text-white",
      "bg-gray-400 text-white",
      "bg-amber-600 text-white",
    ];
    if (index < 3) {
      return (
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${colors[index]}`}
        >
          {index + 1}
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-gray-200 text-gray-600">
        {index + 1}
      </span>
    );
  };

  const isCustomWeights =
    Math.abs(weightsApplied.weight - DEFAULT_WEIGHTS.weight) > 0.001 ||
    Math.abs(weightsApplied.evasion - DEFAULT_WEIGHTS.evasion) > 0.001 ||
    Math.abs(weightsApplied.energy - DEFAULT_WEIGHTS.energy) > 0.001;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            权衡排行榜
            {isCustomWeights && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                自定义权重
              </span>
            )}
            {recalculating && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse">
                重新计算中...
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            共 {vehicles.length} 款车型 | 综合评分越高，"轻、灵、省" 表现越均衡
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              车型级别
            </label>
            <select
              value={filters.vehicle_class}
              onChange={(e) =>
                handleFilterChange("vehicle_class", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部级别</option>
              {vehicleClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              重量分档
            </label>
            <select
              value={filters.weight_class}
              onChange={(e) =>
                handleFilterChange("weight_class", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">全部分档</option>
              {weightClasses.map((c) => (
                <option key={c.class_name} value={c.class_name}>
                  {c.class_name} ({c.min_weight}-{c.max_weight}kg)
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              排序方式
            </label>
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange("sort_by", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="total_score">综合权衡分</option>
              <option value="curb_weight">整备质量</option>
              <option value="braking_distance">制动距离</option>
              <option value="energy_consumption">百公里能耗</option>
              <option value="evasion_score">避险能力</option>
              <option value="energy_score">能耗经济性</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              排序方向
            </label>
            <select
              value={filters.sort_order}
              onChange={(e) => handleFilterChange("sort_order", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="desc">从高到低</option>
              <option value="asc">从低到高</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      排名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      车型
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      级别
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      整备质量
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      制动距离
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      能耗
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      权衡分
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        加载中...
                      </td>
                    </tr>
                  ) : vehicles.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        暂无数据
                      </td>
                    </tr>
                  ) : (
                    vehicles.map((v, index) => (
                      <tr
                        key={v.id}
                        className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedVehicle?.id === v.id ? "bg-blue-50" : ""}`}
                        onClick={() => setSelectedVehicle(v)}
                      >
                        <td className="px-4 py-3">
                          {getRankBadge((v.rank || index + 1) - 1)}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {v.brand} {v.model}
                            </div>
                            <div className="text-xs text-gray-500">
                              {v.weight_class}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {v.vehicle_class}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 font-mono">
                          {v.curb_weight} kg
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 font-mono">
                          {v.braking_distance} m
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 font-mono">
                          {v.energy_consumption}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${getScoreBg(v.total_score)} transition-all`}
                                style={{ width: `${v.total_score}%` }}
                              />
                            </div>
                            <span
                              className={`font-bold ${getScoreColor(v.total_score)}`}
                            >
                              {v.total_score?.toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/vehicles/${v.id}`}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            onClick={(e) => e.stopPropagation()}
                          >
                            详情 →
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <WeightSlider
            weights={weights}
            onWeightsChange={handleWeightsChange}
            onReset={handleResetWeights}
          />

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              当前车型三项雷达
            </h3>
            {selectedVehicle && (
              <>
                <RadarChart vehicle={selectedVehicle} height={280} />
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">轻量化得分</span>
                    <span
                      className={`font-medium ${getScoreColor(selectedVehicle.weight_score)}`}
                    >
                      {selectedVehicle.weight_score?.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">避险能力</span>
                    <span
                      className={`font-medium ${getScoreColor(selectedVehicle.evasion_score)}`}
                    >
                      {selectedVehicle.evasion_score?.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">能耗经济性</span>
                    <span
                      className={`font-medium ${getScoreColor(selectedVehicle.energy_score)}`}
                    >
                      {selectedVehicle.energy_score?.toFixed(1)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        综合权衡分
                      </span>
                      <span
                        className={`text-lg font-bold ${getScoreColor(selectedVehicle.total_score)}`}
                      >
                        {selectedVehicle.total_score?.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4">
            <h4 className="font-semibold text-gray-900 mb-2">💡 当前权重</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                • <strong>轻量化</strong>：
                {(weightsApplied.weight * 100).toFixed(0)}%
              </li>
              <li>
                • <strong>避险能力</strong>：
                {(weightsApplied.evasion * 100).toFixed(0)}%
              </li>
              <li>
                • <strong>能耗经济</strong>：
                {(weightsApplied.energy * 100).toFixed(0)}%
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VehicleList;
