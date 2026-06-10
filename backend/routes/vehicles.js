const express = require("express");
const router = express.Router();
const db = require("../config/database");
const {
  calculateSingleVehicle,
  calculateAllScores,
  getTradeoffData,
  recalculateWithWeights,
  batchImportVehicles,
  getPendingReviewVehicles,
  getImportBatches,
  reviewVehicle,
  batchReviewVehicles,
  getVehiclesForCompare,
  getDefaultWeights,
  validateWeights,
  checkDuplicateVehicle,
  getAllWeightSchemes,
  getWeightSchemeById,
  createWeightScheme,
  deleteWeightScheme,
  getTradeoffDataByScheme,
} = require("../services/scoringService");

router.get("/", (req, res) => {
  const { vehicle_class, weight_class, status, sort_by, sort_order } =
    req.query;

  let sql = "SELECT * FROM vehicles WHERE 1=1";
  const params = [];

  if (vehicle_class && vehicle_class.trim() !== "") {
    sql += " AND vehicle_class = ?";
    params.push(vehicle_class);
  }
  if (weight_class && weight_class.trim() !== "") {
    sql += " AND weight_class = ?";
    params.push(weight_class);
  }
  if (status && status.trim() !== "") {
    sql += " AND status = ?";
    params.push(status);
  }

  if (sort_by) {
    const validSorts = [
      "curb_weight",
      "braking_distance",
      "energy_consumption",
      "total_score",
      "evasion_score",
      "energy_score",
    ];
    if (validSorts.includes(sort_by)) {
      const order = sort_order === "asc" ? "ASC" : "DESC";
      sql += ` ORDER BY ${sort_by} ${order}`;
    }
  } else {
    sql += " ORDER BY total_score DESC";
  }

  const vehicles = db.prepare(sql).all(...params);
  res.json(vehicles);
});

router.get("/classes", (req, res) => {
  const classes = db
    .prepare("SELECT * FROM weight_classes ORDER BY min_weight")
    .all();
  res.json(classes);
});

router.get("/statistics", (req, res) => {
  const stats = db
    .prepare(
      `
    SELECT cs.*, wc.min_weight, wc.max_weight, wc.description
    FROM class_statistics cs
    JOIN weight_classes wc ON cs.weight_class = wc.class_name
    ORDER BY wc.min_weight
  `,
    )
    .all();
  res.json(stats);
});

router.get("/tradeoff", (req, res) => {
  const data = getTradeoffData();
  res.json(data);
});

router.get("/vehicle-classes", (req, res) => {
  const classes = db
    .prepare(
      `
    SELECT DISTINCT vehicle_class 
    FROM vehicles 
    ORDER BY vehicle_class
  `,
    )
    .all()
    .map((r) => r.vehicle_class);
  res.json(classes);
});

router.get("/weights/default", (req, res) => {
  const weights = getDefaultWeights();
  res.json(weights);
});

router.post("/recalculate-with-weights", (req, res) => {
  const { weight, evasion, energy } = req.body;

  const customWeights = {
    weight: weight !== undefined ? Number(weight) : undefined,
    evasion: evasion !== undefined ? Number(evasion) : undefined,
    energy: energy !== undefined ? Number(energy) : undefined,
  };

  const result = recalculateWithWeights(customWeights);
  res.json(result);
});

router.post("/tradeoff-with-weights", (req, res) => {
  const { weight, evasion, energy } = req.body;

  const customWeights = {
    weight: weight !== undefined ? Number(weight) : undefined,
    evasion: evasion !== undefined ? Number(evasion) : undefined,
    energy: energy !== undefined ? Number(energy) : undefined,
  };

  const data = getTradeoffData(customWeights);
  res.json(data);
});

router.post("/batch-import", (req, res) => {
  const { vehicles } = req.body;

  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return res.status(400).json({ error: "请提供有效的车型数据数组" });
  }

  if (vehicles.length > 100) {
    return res.status(400).json({ error: "单次最多导入100条数据" });
  }

  const result = batchImportVehicles(vehicles);
  res.status(201).json(result);
});

router.get("/pending-review", (req, res) => {
  const vehicles = getPendingReviewVehicles();
  res.json(vehicles);
});

router.get("/import-batches", (req, res) => {
  const batches = getImportBatches();
  res.json(batches);
});

router.post("/batch-review", (req, res) => {
  const { ids, action, review_note } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "请提供车型ID数组" });
  }

  if (!action || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "审核操作必须是 approve 或 reject" });
  }

  const results = batchReviewVehicles(
    ids.map((id) => parseInt(id)),
    action,
    review_note || "",
  );
  res.json({ results, total: results.length });
});

router.get("/compare/multi", (req, res) => {
  const { ids } = req.query;

  if (!ids) {
    return res.status(400).json({ error: "请提供车型ID" });
  }

  const idArray = Array.isArray(ids)
    ? ids
    : ids
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

  if (idArray.length < 2 || idArray.length > 4) {
    return res.status(400).json({ error: "请选择2-4款车型进行对比" });
  }

  const vehicles = getVehiclesForCompare(idArray.map((id) => parseInt(id)));

  if (vehicles.length < 2) {
    return res.status(404).json({ error: "未找到足够的已发布车型" });
  }

  const { weight, evasion, energy } = req.query;
  let customWeights = null;
  if (weight !== undefined || evasion !== undefined || energy !== undefined) {
    customWeights = {
      weight: weight !== undefined ? Number(weight) : undefined,
      evasion: evasion !== undefined ? Number(evasion) : undefined,
      energy: energy !== undefined ? Number(energy) : undefined,
    };
  }

  res.json({
    vehicles,
    weights_applied: validateWeights(customWeights),
  });
});

router.post("/", (req, res) => {
  const {
    brand,
    model,
    vehicle_class,
    curb_weight,
    braking_distance,
    energy_consumption,
    range,
  } = req.body;

  const errors = [];
  if (!brand) errors.push("品牌不能为空");
  if (!model) errors.push("型号不能为空");
  if (!vehicle_class) errors.push("车型级别不能为空");
  if (!curb_weight || curb_weight <= 0) errors.push("整备质量必须大于0");
  if (!braking_distance || braking_distance <= 0)
    errors.push("制动距离必须大于0");
  if (!energy_consumption || energy_consumption <= 0)
    errors.push("能耗必须大于0");
  if (!range || range <= 0) errors.push("续航必须大于0");

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  const trimmedBrand = brand.trim();
  const trimmedModel = model.trim();

  const existing = checkDuplicateVehicle(trimmedBrand, trimmedModel);
  if (existing) {
    return res.status(400).json({ errors: ["该车型已存在"] });
  }

  const stmt = db.prepare(`
    INSERT INTO vehicles (
      brand, model, vehicle_class, curb_weight, braking_distance,
      energy_consumption, range, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
  `);

  const result = stmt.run(
    trimmedBrand,
    trimmedModel,
    vehicle_class,
    curb_weight,
    braking_distance,
    energy_consumption,
    range,
  );
  res.status(201).json({ id: result.lastInsertRowid, status: "draft" });
});

router.post("/calculate-all", (req, res) => {
  const results = calculateAllScores();
  res.json({ calculated: results.length, results });
});

router.get("/:id", (req, res) => {
  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ?")
    .get(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ error: "车型不存在" });
  }
  res.json(vehicle);
});

router.put("/:id", (req, res) => {
  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ?")
    .get(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ error: "车型不存在" });
  }

  if (vehicle.status === "published") {
    return res.status(400).json({ error: "已发布的车型不能修改" });
  }

  const {
    brand,
    model,
    vehicle_class,
    curb_weight,
    braking_distance,
    energy_consumption,
    range,
  } = req.body;

  const newBrand = (brand || vehicle.brand).trim();
  const newModel = (model || vehicle.model).trim();

  const existing = checkDuplicateVehicle(
    newBrand,
    newModel,
    parseInt(req.params.id),
  );
  if (existing) {
    return res.status(400).json({ error: "该车型已存在" });
  }

  const stmt = db.prepare(`
    UPDATE vehicles SET
      brand = ?, model = ?, vehicle_class = ?, curb_weight = ?,
      braking_distance = ?, energy_consumption = ?, range = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    newBrand,
    newModel,
    vehicle_class || vehicle.vehicle_class,
    curb_weight || vehicle.curb_weight,
    braking_distance || vehicle.braking_distance,
    energy_consumption || vehicle.energy_consumption,
    range || vehicle.range,
    req.params.id,
  );

  res.json({ id: req.params.id, status: "updated" });
});

router.post("/:id/calculate", (req, res) => {
  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ?")
    .get(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ error: "车型不存在" });
  }

  if (vehicle.status !== "draft") {
    return res.status(400).json({ error: "只有草稿状态可以测算" });
  }

  const scores = calculateSingleVehicle(parseInt(req.params.id));

  db.prepare("UPDATE vehicles SET status = 'calculated' WHERE id = ?").run(
    req.params.id,
  );

  res.json({
    id: req.params.id,
    status: "calculated",
    ...scores,
  });
});

router.post("/:id/publish", (req, res) => {
  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ?")
    .get(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ error: "车型不存在" });
  }

  if (vehicle.status !== "calculated") {
    return res.status(400).json({ error: "只有测算完成状态可以发布" });
  }

  db.prepare("UPDATE vehicles SET status = 'published' WHERE id = ?").run(
    req.params.id,
  );

  res.json({ id: req.params.id, status: "published" });
});

router.post("/:id/unpublish", (req, res) => {
  db.prepare("UPDATE vehicles SET status = 'calculated' WHERE id = ?").run(
    req.params.id,
  );
  res.json({ id: req.params.id, status: "calculated" });
});

router.post("/:id/review", (req, res) => {
  const { action, review_note } = req.body;

  if (!action || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ error: "审核操作必须是 approve 或 reject" });
  }

  const result = reviewVehicle(
    parseInt(req.params.id),
    action,
    review_note || "",
  );

  if (result && result.error) {
    return res.status(400).json({ error: result.error });
  }

  if (!result) {
    return res.status(404).json({ error: "车型不存在" });
  }

  res.json(result);
});

router.delete("/:id", (req, res) => {
  const vehicle = db
    .prepare("SELECT * FROM vehicles WHERE id = ?")
    .get(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ error: "车型不存在" });
  }

  db.prepare("DELETE FROM vehicles WHERE id = ?").run(req.params.id);
  res.json({ deleted: true });
});

router.get("/weight-schemes", (req, res) => {
  const schemes = getAllWeightSchemes();
  res.json(schemes);
});

router.get("/weight-schemes/:id", (req, res) => {
  const scheme = getWeightSchemeById(req.params.id);
  if (!scheme) {
    return res.status(404).json({ error: "方案不存在" });
  }
  res.json(scheme);
});

router.post("/weight-schemes", (req, res) => {
  const { name, weight, evasion, energy } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "方案名称不能为空" });
  }

  const result = createWeightScheme(name, { weight, evasion, energy });

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json(result);
});

router.delete("/weight-schemes/:id", (req, res) => {
  const result = deleteWeightScheme(req.params.id);
  if (result.error) {
    return res.status(404).json({ error: result.error });
  }
  res.json(result);
});

router.get("/tradeoff/by-scheme/:schemeId", (req, res) => {
  const result = getTradeoffDataByScheme(req.params.schemeId);
  if (result.error) {
    return res.status(404).json({ error: result.error });
  }
  res.json(result);
});

module.exports = router;
