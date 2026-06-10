import { useState, useEffect } from "react";
import { vehiclesAPI } from "../api";

function WeightSlider({ weights, onWeightsChange, onReset }) {
  const [localWeights, setLocalWeights] = useState(weights);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setLocalWeights(weights);
  }, [weights]);

  const total =
    localWeights.weight + localWeights.evasion + localWeights.energy;

  const handleWeightChange = (key, value) => {
    setIsDragging(true);
    const numValue = Math.max(0, Number(value) || 0);
    const newWeights = { ...localWeights, [key]: numValue };
    const newTotal = newWeights.weight + newWeights.evasion + newWeights.energy;

    if (newTotal > 0) {
      const normalized = {
        weight: newWeights.weight / newTotal,
        evasion: newWeights.evasion / newTotal,
        energy: newWeights.energy / newTotal,
      };
      setLocalWeights(normalized);
    } else {
      setLocalWeights(newWeights);
    }
  };

  const handleSliderEnd = () => {
    setIsDragging(false);
    const total =
      localWeights.weight + localWeights.evasion + localWeights.energy;
    if (total <= 0) {
      onWeightsChange({ weight: 0.35, evasion: 0.4, energy: 0.25 });
    } else {
      onWeightsChange(localWeights);
    }
  };

  const getSliderColor = (key) => {
    switch (key) {
      case "weight":
        return "accent-blue-500";
      case "evasion":
        return "accent-red-500";
      case "energy":
        return "accent-green-500";
      default:
        return "accent-gray-500";
    }
  };

  const getBarColor = (key) => {
    switch (key) {
      case "weight":
        return "bg-blue-500";
      case "evasion":
        return "bg-red-500";
      case "energy":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getLabel = (key) => {
    switch (key) {
      case "weight":
        return "轻量化";
      case "evasion":
        return "避险能力";
      case "energy":
        return "能耗经济";
      default:
        return key;
    }
  };

  const getIcon = (key) => {
    switch (key) {
      case "weight":
        return "⚖️";
      case "evasion":
        return "🛡️";
      case "energy":
        return "⚡";
      default:
        return "📊";
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <span>🎛️</span>
            权重调整
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            拖动滑块调整各指标权重，排行榜实时更新
          </p>
        </div>
        <button
          onClick={onReset}
          className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          重置默认
        </button>
      </div>

      <div className="space-y-4">
        {["weight", "evasion", "energy"].map((key) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 flex items-center gap-1.5">
                <span>{getIcon(key)}</span>
                {getLabel(key)}
              </span>
              <span
                className={`font-bold ${getBarColor(key).replace("bg-", "text-")}`}
              >
                {(localWeights[key] * 100).toFixed(0)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getBarColor(key)} transition-all duration-150`}
                  style={{ width: `${localWeights[key] * 100}%` }}
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={localWeights[key] * 100}
              onChange={(e) => handleWeightChange(key, e.target.value / 100)}
              onMouseUp={handleSliderEnd}
              onTouchEnd={handleSliderEnd}
              className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${getSliderColor(key)}`}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-indigo-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">权重合计</span>
          <span
            className={`font-bold ${Math.abs(total - 1) < 0.01 ? "text-green-600" : "text-orange-600"}`}
          >
            {(total * 100).toFixed(0)}%
          </span>
        </div>
        {isDragging && (
          <div className="mt-2 text-xs text-indigo-600 animate-pulse">
            ⏳ 正在重新计算...
          </div>
        )}
      </div>

      <div className="mt-3 p-3 bg-white/60 rounded-lg">
        <p className="text-xs text-gray-500">
          💡 <strong>提示：</strong>权重越高，该指标在综合评分中的影响越大。
          系统会自动归一化权重，确保三项合计始终为100%。
        </p>
      </div>
    </div>
  );
}

export default WeightSlider;
