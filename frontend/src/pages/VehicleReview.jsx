import { useState, useEffect } from "react";
import { vehiclesAPI } from "../api";
import {
  getScoreColor,
  getScoreBg,
  getStatusBadge,
} from "../components/Layout";

function VehicleReview() {
  const [pendingVehicles, setPendingVehicles] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, batchesRes] = await Promise.all([
        vehiclesAPI.getPendingReview(),
        vehiclesAPI.getImportBatches(),
      ]);
      setPendingVehicles(pendingRes.data);
      setBatches(batchesRes.data);
    } catch (error) {
      console.error("加载数据失败:", error);
    }
    setLoading(false);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(pendingVehicles.map((v) => v.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const parseImportText = (text) => {
    const lines = text.trim().split("\n");
    const vehicles = [];
    const headers = lines[0].split(/[,，\t]/).map((h) => h.trim());

    const fieldMap = {
      品牌: "brand",
      brand: "brand",
      型号: "model",
      model: "model",
      车型级别: "vehicle_class",
      级别: "vehicle_class",
      vehicle_class: "vehicle_class",
      整备质量: "curb_weight",
      重量: "curb_weight",
      curb_weight: "curb_weight",
      制动距离: "braking_distance",
      百公里制动: "braking_distance",
      braking_distance: "braking_distance",
      百公里能耗: "energy_consumption",
      能耗: "energy_consumption",
      energy_consumption: "energy_consumption",
      续航里程: "range",
      续航: "range",
      range: "range",
    };

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = lines[i].split(/[,，\t]/).map((v) => v.trim());
      const vehicle = {};

      headers.forEach((header, idx) => {
        const field = fieldMap[header.toLowerCase()] || fieldMap[header];
        if (field && values[idx]) {
          vehicle[field] = values[idx];
        }
      });

      if (Object.keys(vehicle).length > 0) {
        vehicles.push(vehicle);
      }
    }

    return vehicles;
  };

  const handleImport = async () => {
    if (!importText.trim()) {
      alert("请输入要导入的数据");
      return;
    }

    try {
      const vehicles = parseImportText(importText);
      if (vehicles.length === 0) {
        alert("未解析到有效数据，请检查格式");
        return;
      }

      const result = await vehiclesAPI.batchImport(vehicles);
      setImportResult(result.data);
      await loadData();
    } catch (error) {
      alert(error.response?.data?.error || "导入失败");
    }
  };

  const handleReview = async (id, action) => {
    if (
      !confirm(
        `确定要${action === "approve" ? "通过" : "拒绝"}这款车型的审核吗？`,
      )
    )
      return;

    try {
      await vehiclesAPI.reviewVehicle(id, action, reviewNote);
      setReviewNote("");
      loadData();
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch (error) {
      alert(error.response?.data?.error || "审核失败");
    }
  };

  const handleBatchReview = async (action) => {
    if (selectedIds.length === 0) {
      alert("请先选择要审核的车型");
      return;
    }
    if (
      !confirm(
        `确定要批量${action === "approve" ? "通过" : "拒绝"} ${selectedIds.length} 款车型的审核吗？`,
      )
    )
      return;

    setProcessing(true);
    try {
      await vehiclesAPI.batchReview(selectedIds, action, reviewNote);
      setSelectedIds([]);
      setReviewNote("");
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || "批量审核失败");
    }
    setProcessing(false);
  };

  const getSampleText = () => {
    return `品牌,型号,车型级别,整备质量,制动距离,百公里能耗,续航里程
特斯拉,Model 3,中型车,1645,36.8,8.8,556
比亚迪,汉EV,中大型车,2020,37.5,9.2,715
蔚来,ET5,中型车,1900,37.2,9.0,560`;
  };

  const renderVehicleRow = (v) => {
    const isSelected = selectedIds.includes(v.id);

    return (
      <tr
        key={v.id}
        className={`hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
      >
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleSelect(v.id, e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-gray-900">
            {v.brand} {v.model}
          </div>
          <div className="text-xs text-gray-500">
            批次: {v.import_batch_id || "手动录入"} ·{" "}
            {new Date(v.created_at).toLocaleString()}
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
        <td className="px-4 py-3 text-center text-sm font-mono">{v.range}km</td>
        <td className="px-4 py-3 text-center">{getStatusBadge(v.status)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => handleReview(v.id, "approve")}
              className="px-3 py-1.5 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 transition-colors"
            >
              ✓ 通过
            </button>
            <button
              onClick={() => handleReview(v.id, "reject")}
              className="px-3 py-1.5 bg-red-100 text-red-700 rounded text-xs font-medium hover:bg-red-200 transition-colors"
            >
              ✗ 拒绝
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">批量导入与审核</h1>
          <p className="text-sm text-gray-500 mt-1">
            批量导入车型数据，审核通过后进入正式排行榜
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            📥 批量导入
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待审核</p>
              <p className="text-2xl font-bold text-orange-600">
                {pendingVehicles.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-xl">⏳</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已通过</p>
              <p className="text-2xl font-bold text-green-600">
                {batches.reduce((sum, b) => sum + b.published_count, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">✅</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已拒绝</p>
              <p className="text-2xl font-bold text-red-600">
                {batches.reduce((sum, b) => sum + b.rejected_count, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-xl">❌</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">导入批次</p>
              <p className="text-2xl font-bold text-blue-600">
                {batches.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📦</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 p-4">
        <div className="flex items-start gap-4">
          <div className="text-2xl">📋</div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">审核流程说明</h4>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="px-2 py-1 bg-white rounded font-medium">
                批量导入
              </span>
              <span className="text-gray-400">→</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                待审核
              </span>
              <span className="text-gray-400">→ 审核通过 →</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium">
                测算完成
              </span>
              <span className="text-gray-400">→ 去车型管理发布 →</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                已发布
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              审核通过后系统会自动测算评分，请前往「车型管理」页面完成发布
            </p>
          </div>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-blue-700 font-medium">
              已选择 {selectedIds.length} 款车型
            </span>
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="审核备注（可选）"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <button
              onClick={() => handleBatchReview("approve")}
              disabled={processing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {processing ? "处理中..." : "✓ 批量通过"}
            </button>
            <button
              onClick={() => handleBatchReview("reject")}
              disabled={processing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {processing ? "处理中..." : "✗ 批量拒绝"}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "pending"
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              待审核 ({pendingVehicles.length})
            </button>
            <button
              onClick={() => setActiveTab("batches")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "batches"
                  ? "border-blue-500 text-blue-600 bg-blue-50"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              导入批次 ({batches.length})
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === "pending" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={
                          pendingVehicles.length > 0 &&
                          selectedIds.length === pendingVehicles.length
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </th>
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
                      续航
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
                        colSpan="9"
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        加载中...
                      </td>
                    </tr>
                  ) : pendingVehicles.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        <div className="text-4xl mb-2">🎉</div>
                        <p>暂无待审核的车型</p>
                        <p className="text-sm mt-1">
                          点击"批量导入"按钮添加新车型
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pendingVehicles.map(renderVehicleRow)
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "batches" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      批次ID
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      导入时间
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      总数
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      待审核
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      已通过
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      已拒绝
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {batches.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-4 py-12 text-center text-gray-500"
                      >
                        暂无导入批次
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr
                        key={batch.import_batch_id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 font-mono text-sm">
                          {batch.import_batch_id}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {new Date(batch.imported_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center font-medium">
                          {batch.total_count}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            {batch.pending_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            {batch.published_count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                            {batch.rejected_count}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  批量导入车型
                </h3>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportText("");
                    setImportResult(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">
                  📋 导入格式说明
                </h4>
                <p className="text-sm text-blue-700 mb-2">
                  支持 CSV
                  或制表符分隔的文本数据，第一行为表头，支持以下字段名：
                </p>
                <div className="text-xs text-blue-600 space-y-1">
                  <p>• 品牌/brand, 型号/model, 车型级别/vehicle_class</p>
                  <p>
                    • 整备质量/curb_weight (kg), 制动距离/braking_distance (m)
                  </p>
                  <p>• 百公里能耗/energy_consumption, 续航里程/range (km)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  粘贴数据
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={getSampleText()}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setImportText(getSampleText())}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  填入示例
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportText("");
                    setImportResult(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  开始导入
                </button>
              </div>

              {importResult && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    importResult.error_count > 0
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-green-50 border border-green-200"
                  }`}
                >
                  <h4
                    className={`font-medium mb-2 ${
                      importResult.error_count > 0
                        ? "text-yellow-900"
                        : "text-green-900"
                    }`}
                  >
                    导入结果
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      批次ID:{" "}
                      <span className="font-mono">{importResult.batch_id}</span>
                    </p>
                    <p className="text-green-700">
                      成功导入: {importResult.success_count} 条
                    </p>
                    {importResult.error_count > 0 && (
                      <p className="text-red-600">
                        失败: {importResult.error_count} 条
                      </p>
                    )}
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-white rounded border">
                        <p className="font-medium text-red-600 mb-1">
                          错误详情:
                        </p>
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <p key={i} className="text-xs text-red-500">
                            第{err.row}行: {err.error}
                          </p>
                        ))}
                        {importResult.errors.length > 5 && (
                          <p className="text-xs text-gray-500">
                            ...还有 {importResult.errors.length - 5} 条错误
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setImportResult(null);
                      setImportText("");
                      setShowImportModal(false);
                    }}
                    className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                  >
                    完成
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehicleReview;
