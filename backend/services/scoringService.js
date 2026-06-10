const db = require("../config/database");

const DEFAULT_WEIGHTS = {
  weight: 0.35,
  evasion: 0.4,
  energy: 0.25,
};

function getWeightClass(curbWeight) {
  const weightClasses = db
    .prepare("SELECT * FROM weight_classes ORDER BY min_weight")
    .all();
  for (const wc of weightClasses) {
    if (curbWeight >= wc.min_weight && curbWeight < wc.max_weight) {
      return wc.class_name;
    }
  }
  return weightClasses[weightClasses.length - 1].class_name;
}

function normalize(value, min, max, invert = false) {
  if (max === min) {
    return 0.5;
  }
  const normalized = (value - min) / (max - min);
  return invert ? 1 - normalized : normalized;
}

function getMinMaxValues(vehicles) {
  const weights = vehicles.map((v) => v.curb_weight);
  const brakings = vehicles.map((v) => v.braking_distance);
  const energies = vehicles.map((v) => v.energy_consumption);

  return {
    minWeight: Math.min(...weights),
    maxWeight: Math.max(...weights),
    minBraking: Math.min(...brakings),
    maxBraking: Math.max(...brakings),
    minEnergy: Math.min(...energies),
    maxEnergy: Math.max(...energies),
  };
}

function validateWeights(customWeights) {
  if (!customWeights) return DEFAULT_WEIGHTS;

  const {
    weight = DEFAULT_WEIGHTS.weight,
    evasion = DEFAULT_WEIGHTS.evasion,
    energy = DEFAULT_WEIGHTS.energy,
  } = customWeights;

  const w = Math.max(0, Number(weight) || 0);
  const e = Math.max(0, Number(evasion) || 0);
  const en = Math.max(0, Number(energy) || 0);
  const total = w + e + en;

  if (total <= 0) {
    return DEFAULT_WEIGHTS;
  }

  if (Math.abs(total - 1) > 0.01) {
    return {
      weight: w / total,
      evasion: e / total,
      energy: en / total,
    };
  }

  return {
    weight: w,
    evasion: e,
    energy: en,
  };
}

function calculateScores(vehicle, allVehicles, customWeights = null) {
  const { minWeight, maxWeight, minBraking, maxBraking, minEnergy, maxEnergy } =
    getMinMaxValues(allVehicles);
  const weights = validateWeights(customWeights);

  const weightScore =
    normalize(vehicle.curb_weight, minWeight, maxWeight, true) * 100;
  const evasionScore =
    normalize(vehicle.braking_distance, minBraking, maxBraking, true) * 100;
  const energyScore =
    normalize(vehicle.energy_consumption, minEnergy, maxEnergy, true) * 100;

  const totalScore =
    weightScore * weights.weight +
    evasionScore * weights.evasion +
    energyScore * weights.energy;

  const weightClass = getWeightClass(vehicle.curb_weight);

  return {
    weight_score: Math.round(weightScore * 100) / 100,
    evasion_score: Math.round(evasionScore * 100) / 100,
    energy_score: Math.round(energyScore * 100) / 100,
    total_score: Math.round(totalScore * 100) / 100,
    weight_class: weightClass,
    weights_applied: weights,
  };
}

function calculateScoresWithWeights(vehicles, customWeights) {
  const weights = validateWeights(customWeights);
  const minMax = getMinMaxValues(vehicles);

  return vehicles
    .map((vehicle) => {
      const weightScore =
        normalize(
          vehicle.curb_weight,
          minMax.minWeight,
          minMax.maxWeight,
          true,
        ) * 100;
      const evasionScore =
        normalize(
          vehicle.braking_distance,
          minMax.minBraking,
          minMax.maxBraking,
          true,
        ) * 100;
      const energyScore =
        normalize(
          vehicle.energy_consumption,
          minMax.minEnergy,
          minMax.maxEnergy,
          true,
        ) * 100;

      const totalScore =
        weightScore * weights.weight +
        evasionScore * weights.evasion +
        energyScore * weights.energy;

      return {
        ...vehicle,
        weight_score: Math.round(weightScore * 100) / 100,
        evasion_score: Math.round(evasionScore * 100) / 100,
        energy_score: Math.round(energyScore * 100) / 100,
        total_score: Math.round(totalScore * 100) / 100,
        rank: 0,
      };
    })
    .sort((a, b) => b.total_score - a.total_score)
    .map((v, i) => ({ ...v, rank: i + 1 }));
}

function calculateAllScores() {
  const allVehicles = db.prepare("SELECT * FROM vehicles").all();
  if (allVehicles.length === 0) return [];

  const results = [];
  const updateStmt = db.prepare(`
    UPDATE vehicles 
    SET weight_score = ?, evasion_score = ?, energy_score = ?, 
        total_score = ?, weight_class = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  for (const vehicle of allVehicles) {
    const scores = calculateScores(vehicle, allVehicles);
    updateStmt.run(
      scores.weight_score,
      scores.evasion_score,
      scores.energy_score,
      scores.total_score,
      scores.weight_class,
      vehicle.id,
    );
    results.push({ id: vehicle.id, ...scores });
  }

  recalculateClassStatistics();

  return results;
}

function calculateSingleVehicle(vehicleId) {
  const allVehicles = db.prepare("SELECT * FROM vehicles").all();
  const vehicle = allVehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return null;

  const scores = calculateScores(vehicle, allVehicles);
  const updateStmt = db.prepare(`
    UPDATE vehicles 
    SET weight_score = ?, evasion_score = ?, energy_score = ?, 
        total_score = ?, weight_class = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  updateStmt.run(
    scores.weight_score,
    scores.evasion_score,
    scores.energy_score,
    scores.total_score,
    scores.weight_class,
    vehicleId,
  );

  recalculateClassStatistics();

  return { id: vehicleId, ...scores };
}

function recalculateClassStatistics() {
  const weightClasses = db
    .prepare("SELECT class_name FROM weight_classes ORDER BY min_weight")
    .all();
  const deleteStmt = db.prepare("DELETE FROM class_statistics");
  deleteStmt.run();

  const insertStmt = db.prepare(`
    INSERT INTO class_statistics (
      weight_class, vehicle_count, avg_braking_distance, avg_energy_consumption,
      avg_evasion_score, avg_energy_score, avg_total_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const wc of weightClasses) {
    const vehicles = db
      .prepare(
        `
      SELECT * FROM vehicles 
      WHERE weight_class = ? AND status = 'published'
    `,
      )
      .all(wc.class_name);

    if (vehicles.length > 0) {
      const avgBraking =
        vehicles.reduce((sum, v) => sum + v.braking_distance, 0) /
        vehicles.length;
      const avgEnergy =
        vehicles.reduce((sum, v) => sum + v.energy_consumption, 0) /
        vehicles.length;
      const avgEvasion =
        vehicles.reduce((sum, v) => sum + (v.evasion_score || 0), 0) /
        vehicles.length;
      const avgEnergyScore =
        vehicles.reduce((sum, v) => sum + (v.energy_score || 0), 0) /
        vehicles.length;
      const avgTotal =
        vehicles.reduce((sum, v) => sum + (v.total_score || 0), 0) /
        vehicles.length;

      insertStmt.run(
        wc.class_name,
        vehicles.length,
        Math.round(avgBraking * 100) / 100,
        Math.round(avgEnergy * 100) / 100,
        Math.round(avgEvasion * 100) / 100,
        Math.round(avgEnergyScore * 100) / 100,
        Math.round(avgTotal * 100) / 100,
      );
    } else {
      insertStmt.run(wc.class_name, 0, 0, 0, 0, 0, 0);
    }
  }
}

function getTradeoffData(customWeights = null) {
  const vehicles = db
    .prepare(
      `
    SELECT * FROM vehicles 
    WHERE status = 'published'
    ORDER BY curb_weight
  `,
    )
    .all();

  let resultVehicles = vehicles;
  if (customWeights) {
    resultVehicles = calculateScoresWithWeights(vehicles, customWeights);
  }

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

  return {
    vehicles: resultVehicles.map((v) => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      vehicle_class: v.vehicle_class,
      curb_weight: v.curb_weight,
      braking_distance: v.braking_distance,
      energy_consumption: v.energy_consumption,
      range: v.range,
      evasion_score: v.evasion_score,
      energy_score: v.energy_score,
      weight_score: v.weight_score,
      total_score: v.total_score,
      weight_class: v.weight_class,
      rank: v.rank,
    })),
    classStatistics: stats,
    weights_applied: validateWeights(customWeights),
  };
}

function recalculateWithWeights(customWeights) {
  const vehicles = db
    .prepare(
      `
    SELECT * FROM vehicles 
    WHERE status = 'published'
  `,
    )
    .all();

  if (vehicles.length === 0) {
    return { vehicles: [], weights_applied: validateWeights(customWeights) };
  }

  const recalculated = calculateScoresWithWeights(vehicles, customWeights);

  return {
    vehicles: recalculated,
    weights_applied: validateWeights(customWeights),
  };
}

function checkDuplicateVehicle(brand, model, excludeId = null) {
  const sql = `
    SELECT id FROM vehicles 
    WHERE brand = ? AND model = ?
    ${excludeId ? "AND id != ?" : ""}
    LIMIT 1
  `;
  const params = excludeId ? [brand, model, excludeId] : [brand, model];
  return db.prepare(sql).get(...params);
}

function batchImportVehicles(vehiclesData) {
  const insertStmt = db.prepare(`
    INSERT INTO vehicles (
      brand, model, vehicle_class, curb_weight, braking_distance,
      energy_consumption, range, status, import_batch_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review', ?)
  `);

  const batchId = Date.now().toString();
  const results = [];
  const errors = [];
  const seen = new Set();

  const transaction = db.transaction((vehicles) => {
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      try {
        if (
          !v.brand ||
          !v.model ||
          !v.vehicle_class ||
          !v.curb_weight ||
          !v.braking_distance ||
          !v.energy_consumption ||
          !v.range
        ) {
          errors.push({ row: i + 1, error: "缺少必填字段", data: v });
          continue;
        }

        const brand = v.brand.trim();
        const model = v.model.trim();
        const key = `${brand.toLowerCase()}|${model.toLowerCase()}`;

        if (seen.has(key)) {
          errors.push({ row: i + 1, error: "当前批次内存在重复车型", data: v });
          continue;
        }

        const existing = checkDuplicateVehicle(brand, model);
        if (existing) {
          errors.push({
            row: i + 1,
            error: "车型已存在",
            data: v,
            existing_id: existing.id,
          });
          continue;
        }

        seen.add(key);

        const result = insertStmt.run(
          brand,
          model,
          v.vehicle_class,
          Number(v.curb_weight),
          Number(v.braking_distance),
          Number(v.energy_consumption),
          Number(v.range),
          batchId,
        );
        results.push({
          row: i + 1,
          id: result.lastInsertRowid,
          status: "pending_review",
        });
      } catch (e) {
        errors.push({ row: i + 1, error: e.message, data: v });
      }
    }
  });

  transaction(vehiclesData);

  return {
    batch_id: batchId,
    success_count: results.length,
    error_count: errors.length,
    results,
    errors,
  };
}

function getPendingReviewVehicles() {
  return db
    .prepare(
      `
    SELECT * FROM vehicles 
    WHERE status = 'pending_review'
    ORDER BY created_at DESC
  `,
    )
    .all();
}

function getImportBatches() {
  const batches = db
    .prepare(
      `
    SELECT 
      import_batch_id,
      COUNT(*) as total_count,
      SUM(CASE WHEN status = 'pending_review' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      MIN(created_at) as imported_at
    FROM vehicles 
    WHERE import_batch_id IS NOT NULL
    GROUP BY import_batch_id
    ORDER BY imported_at DESC
  `,
    )
    .all();

  return batches;
}

function reviewVehicle(id, action, reviewNote = "") {
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
  if (!vehicle) return null;
  if (vehicle.status !== "pending_review") {
    return { error: "只有待审核状态的车型可以审核" };
  }

  if (action === "approve") {
    const allVehicles = db.prepare("SELECT * FROM vehicles").all();
    const scores = calculateScores(vehicle, allVehicles);
    db.prepare(
      `
      UPDATE vehicles 
      SET status = 'calculated',
          weight_score = ?,
          evasion_score = ?,
          energy_score = ?,
          total_score = ?,
          weight_class = ?,
          review_note = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(
      scores.weight_score,
      scores.evasion_score,
      scores.energy_score,
      scores.total_score,
      scores.weight_class,
      reviewNote,
      id,
    );
    recalculateClassStatistics();
    return { id, status: "calculated", scores };
  } else if (action === "reject") {
    db.prepare(
      `
      UPDATE vehicles 
      SET status = 'rejected',
          review_note = ?,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(reviewNote, id);
    return { id, status: "rejected" };
  }

  return { error: "无效的审核操作" };
}

function batchReviewVehicles(ids, action, reviewNote = "") {
  const results = [];
  for (const id of ids) {
    const result = reviewVehicle(id, action, reviewNote);
    results.push({ id, ...result });
  }
  return results;
}

function getVehiclesForCompare(ids) {
  const placeholders = ids.map(() => "?").join(",");
  const vehicles = db
    .prepare(
      `
    SELECT * FROM vehicles 
    WHERE id IN (${placeholders}) AND status = 'published'
  `,
    )
    .all(...ids);

  return vehicles;
}

function getDefaultWeights() {
  return DEFAULT_WEIGHTS;
}

module.exports = {
  getWeightClass,
  calculateScores,
  calculateScoresWithWeights,
  calculateAllScores,
  calculateSingleVehicle,
  recalculateClassStatistics,
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
  normalize,
  getMinMaxValues,
};
