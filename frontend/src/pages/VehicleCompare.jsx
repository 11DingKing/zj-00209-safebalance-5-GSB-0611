import { useState, useEffect, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { vehiclesAPI } from "../api";
import { getScoreColor } from "../components/Layout";

const VEHICLE_COLORS = [
  { main: "#3b82f6", bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-600" },
  { main: "#ef4444", bg: "bg-red-100", border: "border-red-400", text: "text-red-600" },
  { main: "#10b981", bg: "bg-green-100", border: "border-green-400", text: "text-green-600" },
  { main: "#f59e0b", bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-600" },
];

const VEHICLE_LABELS = ["A", "B", "C", "D"];

function VehicleCompare() {
  const [allVehicles, setAllVehicles] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState({ weight: 0.35, evasion: 0.4, energy: 0.25 });

  useEffect(() => {
    loadVehicles();
    loadDefaultWeights();
  }, []);

  const loadDefaultWeights = async () => {
    try {
      const res = await vehiclesAPI.getDefaultWeights();
      setWeights(res.data);
    } catch (error) {
      console.error("加载默认权重失败:", error);
    }
  };

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const res = await vehiclesAPI.getAll({
        status: "published",
        sort_by: "total_score",
        sort_order: "desc",
      });
      setAllVehicles(res.data);
      if (res.data.length >= 2) {
        setSelectedIds([res.data[0].id, res.data[res.data.length - 1].id]);
      }
    } catch (error) {
      console.error("加载车型列表失败:", error);
    }
    setLoading(false);
  };

  const handleVehicleToggle = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectedVehicles = useMemo(() => {
    return selectedIds
      .map((id) => allVehicles.find((v) => v.id === id))
      .filter(Boolean);
  }, [selectedIds, allVehicles]);

  const sortedByScore = useMemo(() => {
    return [...selectedVehicles].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
  }, [selectedVehicles]);

  const getBestValue = (key, type = "higher") => {
    if (selectedVehicles.length === 0) return null;
    return type === "higher"
      ? selectedVehicles.reduce((best, v) => (v[key] > best[key] ? v : best))
      : selectedVehicles.reduce((best, v) => (v[key] < best[key] ? v : best));
  };

  const getMultiRadarOption = () => {
    if (selectedVehicles.length < 2) return {};

    return {
      tooltip: { trigger: "item" },
      legend: {
        data: selectedVehicles.map((v) => `${v.brand} ${v.model}`),
        top: 0,
        type: "scroll",
      },
      radar: {
        indicator: [
          { name: "轻量化得分", max: 100 },
          { name: "避险能力", max: 100 },
          { name: "能耗经济性", max: 100 },
        ],
        shape: "polygon",
        splitNumber: 4,
        axisName: { color: "#475569", fontSize: 12 },
        splitLine: { lineStyle: { color: ["#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b"] } },
        splitArea: {
          show: true,
          areaStyle: { color: ["rgba(59, 130, 246, 0.03)", "rgba(59, 130, 246, 0.06)"] },
        },
      },
      series: [
        {
          type: "radar",
          data: selectedVehicles.map((v, idx) => ({
            value: [v.weight_score, v.evasion_score, v.energy_score],
            name: `${v.brand} ${v.model}`,
            symbol: "circle",
            symbolSize: 6,
            lineStyle: { color: VEHICLE_COLORS[idx].main, width: 2 },
            areaStyle: { color: `${VEHICLE_COLORS[idx].main}33` },
            itemStyle: { color: VEHICLE_COLORS[idx].main },
          })),
        },
      ],
    };
  };

  const getScoreCompareOption = () => {
    if (selectedVehicles.length < 2) return {};

    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: {
        type: "category",
        data: selectedVehicles.map((v) => `${v.brand} ${v.model}`),
        axisLabel: { interval: 0, rotate: selectedVehicles.length > 2 ? 30 : 0, fontSize: 11 },
      },
      yAxis: { type: "value", max: 100, name: "得分" },
      series: [
        {
          type: "bar",
          data: selectedVehicles.map((v, idx) => ({
            value: v.total_score?.toFixed(1),
            itemStyle: {
              color: VEHICLE_COLORS[idx].main,
              borderRadius: [4, 4, 0, 0],
            },
          })),
          label: { show: true, position: "top", fontWeight: "bold" },
          barWidth: "40%",
        },
      ],
    };
  };

  const renderMetricRow = (label, key, unit, isBetter = "higher") => {
    const best = getBestValue(key, isBetter);
    return (
      <div className="py-3 border-b border-gray-100">
        <div className="text-sm text-gray-500 mb-2">{label}</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${selectedVehicles.length}, 1fr)` }}>
          {selectedVehicles.map((v, idx) => {
            const isBest = best && v.id === best.id;
            const value = typeof v[key] === "number" ? v[key].toFixed(key.includes("score") ? 1 : 1) : "-";
            return (
              <div key={v.id} className="text-center">
                <div className={`text-lg font-bold ${isBest ? "text-green-600" : "text-gray-700"}`}>
                  {value}{unit}
                  {isBest && <span className="ml-1 text-sm">✓</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">多车情景对比</h1>
          <p className="text-sm text-gray-500 mt-1">
            选择2-4款车型，并排对比重量带来的安全与能耗差异
          </p>
        </div>
        <button
          onClick={() => setShowVehicleSelector(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          选择车型 ({selectedVehicles.length}/4)
        </button>
      </div>

      {selectedVehicles.length < 2 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-4">🚗</div>
          <div className="text-gray-500 mb-4">请选择至少2款车型进行对比</div>
          <button
            onClick={() => setShowVehicleSelector(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            开始选择
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(selectedVehicles.length, 4)}, 1fr)` }}>
            {selectedVehicles.map((v, idx) => (
              <div
                key={v.id}
                className={`bg-white rounded-xl shadow-sm border-2 p-5 ${VEHICLE_COLORS[idx].border}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${VEHICLE_COLORS[idx].bg} text-gray-700`}>
                      车型 {VEHICLE_LABELS[idx]}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900">
                      {v.brand} {v.model}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {v.vehicle_class} · {v.weight_class}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">权衡分</div>
                    <div className={`text-2xl font-bold ${getScoreColor(v.total_score)}`}>
                      {v.total_score?.toFixed(1)}
                    </div>
                    {sortedByScore[0]?.id === v.id && (
                      <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        🏆 最优
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">三项雷达对比</h3>
              <ReactECharts option={getMultiRadarOption()} style={{ height: 350 }} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">综合权衡分对比</h3>
              <ReactECharts option={getScoreCompareOption()} style={{ height: 350 }} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">核心指标对比</h3>
            
            <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: `repeat(${selectedVehicles.length}, 1fr)` }}>
              {selectedVehicles.map((v, idx) => (
                <div key={v.id} className="text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 ${VEHICLE_COLORS[idx].bg} text-gray-700`}>
                    车型 {VEHICLE_LABELS[idx]}
                  </span>
                  <div className="font-medium text-gray-900 text-sm">
                    {v.brand} {v.model}
                  </div>
                </div>
              ))}
            </div>

            <div className="divide-y divide-gray-100">
              {renderMetricRow('整备质量', 'curb_weight', 'kg', 'lower')}
              {renderMetricRow('百公里制动 (m)', 'braking_distance', '', 'lower')}
              {renderMetricRow('百公里能耗', 'energy_consumption', '', 'lower')}
              {renderMetricRow('续航里程 (km)', 'range', '', 'higher')}
              {renderMetricRow('轻量化得分', 'weight_score', '', 'higher')}
              {renderMetricRow('避险能力', 'evasion_score', '', 'higher')}
              {renderMetricRow('能耗经济', 'energy_score', '', 'higher')}
              {renderMetricRow('综合权衡分', 'total_score', '', 'higher')}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">🔍 情景分析结论</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/70 rounded-lg p-4">
                <div className="text-indigo-600 font-medium mb-2">重量差异分析</div>
                <p className="text-sm text-gray-600">
                  {sortedByScore.length >= 2 && (
                    <>
                      最轻的 <strong>{sortedByScore[0].brand} {sortedByScore[0].model}</strong>（{sortedByScore[0].curb_weight}kg）
                      比最重的 <strong>{sortedByScore[sortedByScore.length - 1].brand} {sortedByScore[sortedByScore.length - 1].model}</strong>（{sortedByScore[sortedByScore.length - 1].curb_weight}kg）
                      轻 <strong>{sortedByScore[sortedByScore.length - 1].curb_weight - sortedByScore[0].curb_weight}kg</strong>，
                      轻量化优势明显。
                    </>
                  )}
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-4">
                <div className="text-red-600 font-medium mb-2">安全避险分析</div>
                <p className="text-sm text-gray-600">
                  {(() => {
                    const bestBraking = getBestValue('braking_distance', 'lower');
                    const worstBraking = getBestValue('braking_distance', 'higher');
                    if (!bestBraking || !worstBraking) return null;
                    const diff = (worstBraking.braking_distance - bestBraking.braking_distance).toFixed(1);
                    return (
                      <>
                        制动距离差距 <strong>{diff}m</strong>，
                        <strong>{bestBraking.brand} {bestBraking.model}</strong> 在紧急情况下能更快停下，
                        比 <strong>{worstBraking.brand} {worstBraking.model}</strong> 安全冗余更高。
                      </>
                    );
                  })()}
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-4">
                <div className="text-green-600 font-medium mb-2">能耗成本分析</div>
                <p className="text-sm text-gray-600">
                  {(() => {
                    const bestEnergy = getBestValue('energy_consumption', 'lower');
                    const worstEnergy = getBestValue('energy_consumption', 'higher');
                    if (!bestEnergy || !worstEnergy) return null;
                    const diff = (worstEnergy.energy_consumption - bestEnergy.energy_consumption).toFixed(1);
                    const annualSave = (diff * 200).toFixed(0);
                    return (
                      <>
                        百公里能耗差距 <strong>{diff}</strong>，
                        按年行驶2万公里计算，
                        <strong>{bestEnergy.brand} {bestEnergy.model}</strong> 每年可节省约
                        <strong> {annualSave} 元</strong> 能耗费用。
                      </>
                    );
                  })()}
                </p>
              </div>
            </div>

            {selectedVehicles.length >= 3 && (
              <div className="mt-4 p-4 bg-white/70 rounded-lg">
                <div className="text-blue-600 font-medium mb-2">🏆 综合推荐</div>
                <p className="text-sm text-gray-600">
                  从综合权衡分来看，
                  <strong className="text-green-600"> {sortedByScore[0].brand} {sortedByScore[0].model} </strong>
                  以 <strong className="text-green-600">{sortedByScore[0].total_score?.toFixed(1)}</strong> 分排名第一，
                  在"轻、灵、省"三方面取得了最佳平衡。
                  {sortedByScore[0].curb_weight <= 1800 && (
                    <span> 作为{sortedByScore[0].weight_class}车型，在保证安全性的同时实现了优秀的轻量化水平。</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {showVehicleSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  选择对比车型 ({selectedIds.length}/4)
                </h3>
                <button
                  onClick={() => setShowVehicleSelector(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                请选择2-4款车型进行对比，点击卡片即可选中或取消
              </p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allVehicles.map((v) => {
                  const isSelected = selectedIds.includes(v.id);
                  const idx = selectedIds.indexOf(v.id);
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleVehicleToggle(v.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected
                          ? `${VEHICLE_COLORS[idx].border} ${VEHICLE_COLORS[idx].bg}`
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {v.brand} {v.model}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {v.vehicle_class} · {v.curb_weight}kg · {v.braking_distance}m
                          </div>
                        </div>
                        <div className="text-right">
                          {isSelected ? (
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${VEHICLE_COLORS[idx].bg} text-gray-700`}>
                              {VEHICLE_LABELS[idx]}
                            </span>
                          ) : (
                            <span className={`text-lg font-bold ${getScoreColor(v.total_score)}`}>
                              {v.total_score?.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowVehicleSelector(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehicleCompare;
