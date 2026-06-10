import { useState, useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { vehiclesAPI } from "../api";
import WeightSlider from "../components/WeightSlider";

const DEFAULT_WEIGHTS = { weight: 0.35, evasion: 0.4, energy: 0.25 };

function TradeoffChart() {
  const [tradeoffData, setTradeoffData] = useState(null);
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [weightsApplied, setWeightsApplied] = useState(DEFAULT_WEIGHTS);
  const [recalculating, setRecalculating] = useState(false);
  const [weightSchemes, setWeightSchemes] = useState([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newSchemeName, setNewSchemeName] = useState("");
  const [saveError, setSaveError] = useState("");
  const debounceRef = useRef(null);

  useEffect(() => {
    loadInitialData();
    loadWeightSchemes();
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      recalculateTradeoffWithWeights();
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [weights]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [tradeoffRes, statsRes] = await Promise.all([
        vehiclesAPI.getTradeoff(),
        vehiclesAPI.getStatistics(),
      ]);
      setTradeoffData(tradeoffRes.data);
      setStatistics(statsRes.data);
      if (tradeoffRes.data.weights_applied) {
        setWeightsApplied(tradeoffRes.data.weights_applied);
      }
    } catch (error) {
      console.error("加载数据失败:", error);
    }
    setLoading(false);
  };

  const loadWeightSchemes = async () => {
    try {
      const res = await vehiclesAPI.getWeightSchemes();
      setWeightSchemes(res.data);
    } catch (error) {
      console.error("加载权重方案失败:", error);
    }
  };

  const recalculateTradeoffWithWeights = async () => {
    setRecalculating(true);
    try {
      const res = await vehiclesAPI.getTradeoffWithWeights(weights);
      setTradeoffData(res.data);
      setWeightsApplied(res.data.weights_applied);
      setSelectedSchemeId("");
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

  const handleSchemeSelect = async (e) => {
    const schemeId = e.target.value;
    setSelectedSchemeId(schemeId);

    if (!schemeId) {
      return;
    }

    try {
      setLoading(true);
      const res = await vehiclesAPI.getTradeoffByScheme(schemeId);
      setTradeoffData(res.data);
      setWeightsApplied(res.data.weights_applied);
      setWeights(res.data.weights_applied);
    } catch (error) {
      console.error("应用方案失败:", error);
    }
    setLoading(false);
  };

  const handleSaveScheme = async () => {
    setSaveError("");

    if (!newSchemeName.trim()) {
      setSaveError("请输入方案名称");
      return;
    }

    try {
      await vehiclesAPI.createWeightScheme(newSchemeName.trim(), weights);
      setShowSaveDialog(false);
      setNewSchemeName("");
      setSaveError("");
      loadWeightSchemes();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        setSaveError(error.response.data.error);
      } else {
        setSaveError("保存失败，请重试");
      }
    }
  };

  const handleDeleteScheme = async (schemeId, e) => {
    e.stopPropagation();
    if (!window.confirm("确定要删除这个权重方案吗？")) {
      return;
    }

    try {
      await vehiclesAPI.deleteWeightScheme(schemeId);
      if (selectedSchemeId === String(schemeId)) {
        setSelectedSchemeId("");
      }
      loadWeightSchemes();
    } catch (error) {
      console.error("删除方案失败:", error);
    }
  };

  const getWeightScatterOption = () => {
    if (!tradeoffData) return {};

    const classColors = {
      轻型车: "#10b981",
      紧凑型: "#3b82f6",
      中型车: "#8b5cf6",
      中大型: "#f59e0b",
      重型车: "#ef4444",
    };

    const seriesData = tradeoffData.vehicles.map((v) => ({
      value: [
        v.curb_weight,
        v.braking_distance,
        v.energy_consumption,
        v.total_score,
      ],
      name: `${v.brand} ${v.model}`,
      itemStyle: {
        color: classColors[v.weight_class] || "#64748b",
      },
    }));

    return {
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const d = params.data;
          return `
            <div style="font-weight:600;margin-bottom:8px">${d.name}</div>
            <div>整备质量: <strong>${d.value[0]} kg</strong></div>
            <div>制动距离: <strong>${d.value[1]} m</strong></div>
            <div>百公里能耗: <strong>${d.value[2]}</strong></div>
            <div>综合权衡分: <strong>${d.value[3].toFixed(1)}</strong></div>
          `;
        },
      },
      legend: {
        data: Object.keys(classColors),
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        name: "整备质量 (kg)",
        nameLocation: "middle",
        nameGap: 30,
        type: "value",
        axisLabel: {
          formatter: "{value}",
        },
      },
      yAxis: {
        name: "百公里制动距离 (m)",
        nameLocation: "middle",
        nameGap: 40,
        type: "value",
        inverse: true,
      },
      series: [
        {
          type: "scatter",
          symbolSize: (data) => {
            return Math.max(12, Math.min(30, data[2] * 1.2));
          },
          data: seriesData,
        },
      ],
    };
  };

  const getClassTrendOption = () => {
    if (!statistics || statistics.length === 0) return {};

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "cross",
        },
      },
      legend: {
        data: ["平均制动距离(m)", "平均能耗", "平均总分"],
        top: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: statistics.map((s) => s.weight_class),
        axisPointer: {
          type: "shadow",
        },
      },
      yAxis: [
        {
          type: "value",
          name: "制动距离(m)",
          position: "left",
          axisLine: {
            lineStyle: { color: "#ef4444" },
          },
          axisLabel: {
            formatter: "{value}",
          },
        },
        {
          type: "value",
          name: "能耗",
          position: "right",
          axisLine: {
            lineStyle: { color: "#10b981" },
          },
          axisLabel: {
            formatter: "{value}",
          },
        },
        {
          type: "value",
          name: "权衡分",
          position: "right",
          offset: 60,
          axisLine: {
            lineStyle: { color: "#3b82f6" },
          },
          axisLabel: {
            formatter: "{value}",
          },
        },
      ],
      series: [
        {
          name: "平均制动距离(m)",
          type: "bar",
          data: statistics.map((s) => s.avg_braking_distance),
          itemStyle: {
            color: "rgba(239, 68, 68, 0.7)",
          },
        },
        {
          name: "平均能耗",
          type: "line",
          yAxisIndex: 1,
          data: statistics.map((s) => s.avg_energy_consumption),
          smooth: true,
          lineStyle: {
            color: "#10b981",
            width: 3,
          },
          itemStyle: {
            color: "#10b981",
          },
        },
        {
          name: "平均总分",
          type: "line",
          yAxisIndex: 2,
          data: statistics.map((s) => s.avg_total_score),
          smooth: true,
          lineStyle: {
            color: "#3b82f6",
            width: 3,
            type: "dashed",
          },
          itemStyle: {
            color: "#3b82f6",
          },
        },
      ],
    };
  };

  const getScoreDistributionOption = () => {
    if (!tradeoffData) return {};

    const sortedByWeight = [...tradeoffData.vehicles].sort(
      (a, b) => a.curb_weight - b.curb_weight,
    );

    return {
      tooltip: {
        trigger: "axis",
      },
      legend: {
        data: ["避险能力", "能耗经济性", "综合权衡分"],
        top: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: sortedByWeight.map((v) => `${v.brand}\n${v.model}`),
        axisLabel: {
          interval: 0,
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        max: 100,
        name: "得分",
      },
      series: [
        {
          name: "避险能力",
          type: "line",
          data: sortedByWeight.map((v) => v.evasion_score),
          smooth: true,
          lineStyle: { color: "#ef4444" },
          itemStyle: { color: "#ef4444" },
          areaStyle: {
            color: "rgba(239, 68, 68, 0.1)",
          },
        },
        {
          name: "能耗经济性",
          type: "line",
          data: sortedByWeight.map((v) => v.energy_score),
          smooth: true,
          lineStyle: { color: "#10b981" },
          itemStyle: { color: "#10b981" },
          areaStyle: {
            color: "rgba(16, 185, 129, 0.1)",
          },
        },
        {
          name: "综合权衡分",
          type: "line",
          data: sortedByWeight.map((v) => v.total_score),
          smooth: true,
          lineStyle: { color: "#3b82f6", width: 3 },
          itemStyle: { color: "#3b82f6" },
        },
      ],
    };
  };

  const isCustomWeights =
    Math.abs(weightsApplied.weight - DEFAULT_WEIGHTS.weight) > 0.001 ||
    Math.abs(weightsApplied.evasion - DEFAULT_WEIGHTS.evasion) > 0.001 ||
    Math.abs(weightsApplied.energy - DEFAULT_WEIGHTS.energy) > 0.001;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            重量—避险—能耗 权衡曲线
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
            直观展示车重对安全避险能力和能耗水平的影响关系
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {statistics.map((stat, index) => (
              <div
                key={stat.weight_class}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">
                    {stat.weight_class}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {stat.min_weight}-{stat.max_weight}kg
                  </span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {stat.vehicle_count} 款车型
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">平均制动</span>
                    <span className="font-medium">
                      {stat.avg_braking_distance} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">平均能耗</span>
                    <span className="font-medium">
                      {stat.avg_energy_consumption}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">平均权衡分</span>
                    <span className="font-medium text-blue-600">
                      {stat.avg_total_score}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              车重 vs 制动距离 散点图
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              圆点大小代表能耗水平（越大能耗越高），颜色代表重量分档。理想车型应位于左上区域（轻且制动好）
            </p>
            <ReactECharts
              option={getWeightScatterOption()}
              style={{ height: 450 }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                分档指标趋势
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                各重量分档的平均制动、能耗、权衡分对比
              </p>
              <ReactECharts
                option={getClassTrendOption()}
                style={{ height: 350 }}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                综合得分分布
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                按车重排序的车型三项得分曲线
              </p>
              <ReactECharts
                option={getScoreDistributionOption()}
                style={{ height: 350 }}
              />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-3">📊 数据洞察</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white/60 rounded-lg p-4">
                <div className="text-amber-600 font-medium mb-1">重量影响</div>
                <p className="text-gray-600">
                  车重每增加 500kg，平均制动距离增加约 1-2 米，百公里能耗增加约 3-5
                  个单位
                </p>
              </div>
              <div className="bg-white/60 rounded-lg p-4">
                <div className="text-green-600 font-medium mb-1">最佳区间</div>
                <p className="text-gray-600">
                  1500-1800kg
                  紧凑型车型在安全性和经济性之间取得最佳平衡，平均权衡分最高
                </p>
              </div>
              <div className="bg-white/60 rounded-lg p-4">
                <div className="text-blue-600 font-medium mb-1">技术红利</div>
                <p className="text-gray-600">
                  部分中大型车通过先进制动技术抵消了重量带来的负面影响，避险能力表现出色
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">📁 权重方案</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择方案
                </label>
                <select
                  value={selectedSchemeId}
                  onChange={handleSchemeSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">-- 默认权重 --</option>
                  {weightSchemes.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </div>

              {weightSchemes.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {weightSchemes.map((scheme) => (
                    <div
                      key={scheme.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${selectedSchemeId === String(scheme.id) ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50 border border-transparent"}`}
                      onClick={() => {
                        setSelectedSchemeId(String(scheme.id));
                        handleSchemeSelect({
                          target: { value: String(scheme.id) },
                        });
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {scheme.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          车重 {(scheme.weight * 100).toFixed(0)}% · 避险{" "}
                          {(scheme.evasion * 100).toFixed(0)}% · 能耗{" "}
                          {(scheme.energy * 100).toFixed(0)}%
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteScheme(scheme.id, e)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="删除方案"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setShowSaveDialog(true);
                  setNewSchemeName("");
                  setSaveError("");
                }}
                className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                保存当前权重
              </button>
            </div>
          </div>

          <WeightSlider
            weights={weights}
            onWeightsChange={handleWeightsChange}
            onReset={handleResetWeights}
          />

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

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                保存权重方案
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  方案名称
                </label>
                <input
                  type="text"
                  value={newSchemeName}
                  onChange={(e) => setNewSchemeName(e.target.value)}
                  placeholder="例如：安全优先、经济优先..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveScheme();
                    }
                  }}
                />
                {saveError && (
                  <p className="mt-2 text-sm text-red-600">{saveError}</p>
                )}
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">当前权重：</p>
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>轻量化</span>
                    <span className="font-medium">
                      {(weights.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>避险能力</span>
                    <span className="font-medium">
                      {(weights.evasion * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>能耗经济</span>
                    <span className="font-medium">
                      {(weights.energy * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewSchemeName("");
                  setSaveError("");
                }}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveScheme}
                className="flex-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TradeoffChart;
