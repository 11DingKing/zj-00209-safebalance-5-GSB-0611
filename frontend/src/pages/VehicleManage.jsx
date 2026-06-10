import { useState, useEffect } from "react";
import { vehiclesAPI } from "../api";
import {
  getScoreColor,
  getScoreBg,
  getStatusBadge,
} from "../components/Layout";

function VehicleManage() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleClasses, setVehicleClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    vehicle_class: "中型车",
    curb_weight: "",
    braking_distance: "",
    energy_consumption: "",
    range: "",
  });
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, classesRes] = await Promise.all([
        vehiclesAPI.getAll({ sort_by: "updated_at", sort_order: "desc" }),
        vehiclesAPI.getVehicleClasses(),
      ]);
      setVehicles(vehiclesRes.data);
      setVehicleClasses(classesRes.data);
    } catch (error) {
      console.error("加载数据失败:", error);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    try {
      const data = {
        ...formData,
        curb_weight: parseFloat(formData.curb_weight),
        braking_distance: parseFloat(formData.braking_distance),
        energy_consumption: parseFloat(formData.energy_consumption),
        range: parseFloat(formData.range),
      };

      await vehiclesAPI.create(data);
      setShowForm(false);
      setFormData({
        brand: "",
        model: "",
        vehicle_class: "中型车",
        curb_weight: "",
        braking_distance: "",
        energy_consumption: "",
        range: "",
      });
      loadData();
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    }
  };

  const handleCalculate = async (id) => {
    try {
      await vehiclesAPI.calculate(id);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || "测算失败");
    }
  };

  const handlePublish = async (id) => {
    try {
      await vehiclesAPI.publish(id);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || "发布失败");
    }
  };

  const handleUnpublish = async (id) => {
    try {
      await vehiclesAPI.unpublish(id);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || "取消发布失败");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("确定要删除这款车型吗？")) return;
    try {
      await vehiclesAPI.delete(id);
      loadData();
    } catch (error) {
      alert("删除失败");
    }
  };

  const handleCalculateAll = async () => {
    if (!confirm("确定要重新计算所有车型的评分吗？")) return;
    try {
      await vehiclesAPI.calculateAll();
      loadData();
    } catch (error) {
      alert("计算失败");
    }
  };

  const canCalculate = (status) => status === "draft";
  const canPublish = (status) => status === "calculated";
  const canEdit = (status) => status === "draft";

  const statusCounts = {
    draft: vehicles.filter((v) => v.status === "draft").length,
    calculated: vehicles.filter((v) => v.status === "calculated").length,
    published: vehicles.filter((v) => v.status === "published").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">车型管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            管理车型数据，完成录入 → 测算 → 发布的完整流程
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCalculateAll}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            🔄 重算所有评分
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            + 新增车型
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">草稿状态</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusCounts.draft}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📝</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">测算完成</p>
              <p className="text-2xl font-bold text-yellow-600">
                {statusCounts.calculated}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🧮</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已发布</p>
              <p className="text-2xl font-bold text-green-600">
                {statusCounts.published}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-start gap-4">
          <div className="text-2xl">📋</div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">状态流转说明</h4>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-white rounded font-medium">
                录入/导入
              </span>
              <span className="text-gray-400">→</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">
                草稿
              </span>
              <span className="text-gray-400">/</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                待审核
              </span>
              <span className="text-gray-400">→ 测算/审核 →</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">
                测算完成
              </span>
              <span className="text-gray-400">→ 发布 →</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                已发布
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              注意：批量导入的车型需先审核，审核通过后自动测算，再在此处发布
            </p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  新增车型
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-600">
                      {err}
                    </p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    品牌 *
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="如：宝马"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    型号 *
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="如：325Li"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  车型级别 *
                </label>
                <select
                  name="vehicle_class"
                  value={formData.vehicle_class}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {vehicleClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    整备质量 (kg) *
                  </label>
                  <input
                    type="number"
                    name="curb_weight"
                    value={formData.curb_weight}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="如：1645"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    百公里制动 (m) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="braking_distance"
                    value={formData.braking_distance}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="如：37.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    百公里能耗 *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="energy_consumption"
                    value={formData.energy_consumption}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="如：8.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    续航里程 (km) *
                  </label>
                  <input
                    type="number"
                    name="range"
                    value={formData.range}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="如：780"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  车型
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  级别
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  重量
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  制动
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  能耗
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  权衡分
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  状态
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
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
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {v.brand} {v.model}
                      </div>
                      <div className="text-xs text-gray-500">
                        {v.weight_class || "未分档"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                      {v.vehicle_class}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-mono">
                      {v.curb_weight}kg
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-mono">
                      {v.braking_distance}m
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-mono">
                      {v.energy_consumption}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {v.total_score !== null && v.total_score !== undefined ? (
                        <span
                          className={`font-bold ${getScoreColor(v.total_score)}`}
                        >
                          {v.total_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(v.status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {canCalculate(v.status) && (
                          <button
                            onClick={() => handleCalculate(v.id)}
                            className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium hover:bg-yellow-200"
                          >
                            测算
                          </button>
                        )}
                        {canPublish(v.status) && (
                          <button
                            onClick={() => handlePublish(v.id)}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200"
                          >
                            发布
                          </button>
                        )}
                        {v.status === "published" && (
                          <button
                            onClick={() => handleUnpublish(v.id)}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                          >
                            取消发布
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default VehicleManage;
