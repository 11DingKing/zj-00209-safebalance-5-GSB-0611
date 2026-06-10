const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./config/database");
const vehiclesRoute = require("./routes/vehicles");
const {
  calculateAllScores,
  recalculateClassStatistics,
} = require("./services/scoringService");
const vehiclesData = require("./data/vehiclesData");

const app = express();
const PORT = process.env.PORT || 3001;

function ensureTablesExist() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      vehicle_class TEXT NOT NULL,
      curb_weight INTEGER NOT NULL,
      braking_distance REAL NOT NULL,
      energy_consumption REAL NOT NULL,
      range REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      evasion_score REAL,
      energy_score REAL,
      weight_score REAL,
      total_score REAL,
      weight_class TEXT,
      import_batch_id TEXT,
      review_note TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weight_classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_name TEXT NOT NULL,
      min_weight INTEGER NOT NULL,
      max_weight INTEGER NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS class_statistics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weight_class TEXT NOT NULL,
      vehicle_count INTEGER NOT NULL DEFAULT 0,
      avg_braking_distance REAL,
      avg_energy_consumption REAL,
      avg_evasion_score REAL,
      avg_energy_score REAL,
      avg_total_score REAL,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
    CREATE INDEX IF NOT EXISTS idx_vehicles_class ON vehicles(vehicle_class);
    CREATE INDEX IF NOT EXISTS idx_vehicles_weight_class ON vehicles(weight_class);
    CREATE INDEX IF NOT EXISTS idx_vehicles_score ON vehicles(total_score);
  `);

  const columnsToAdd = [
    { name: "import_batch_id", type: "TEXT" },
    { name: "review_note", type: "TEXT" },
    { name: "reviewed_at", type: "DATETIME" },
  ];

  for (const col of columnsToAdd) {
    try {
      db.prepare(
        `ALTER TABLE vehicles ADD COLUMN ${col.name} ${col.type}`,
      ).run();
    } catch (e) {
      if (!e.message.includes("duplicate column name")) {
        console.log(`添加列 ${col.name} 失败:`, e.message);
      }
    }
  }

  const weightClasses = [
    { name: "轻型车", min: 0, max: 1500, description: "整备质量 1500kg 以下" },
    {
      name: "紧凑型",
      min: 1500,
      max: 1800,
      description: "整备质量 1500-1800kg",
    },
    {
      name: "中型车",
      min: 1800,
      max: 2100,
      description: "整备质量 1800-2100kg",
    },
    {
      name: "中大型",
      min: 2100,
      max: 2500,
      description: "整备质量 2100-2500kg",
    },
    {
      name: "重型车",
      min: 2500,
      max: 10000,
      description: "整备质量 2500kg 以上",
    },
  ];

  const insertClass = db.prepare(`
    INSERT OR REPLACE INTO weight_classes (class_name, min_weight, max_weight, description)
    VALUES (?, ?, ?, ?)
  `);
  for (const wc of weightClasses) {
    insertClass.run(wc.name, wc.min, wc.max, wc.description);
  }
}

function autoInitialize() {
  ensureTablesExist();

  const vehicleCount = db
    .prepare("SELECT COUNT(*) as count FROM vehicles")
    .get().count;
  if (vehicleCount === 0) {
    console.log("检测到空数据库，开始自动初始化...");

    const insertStmt = db.prepare(`
      INSERT INTO vehicles (
        brand, model, vehicle_class, curb_weight, braking_distance,
        energy_consumption, range, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const v of vehiclesData) {
      insertStmt.run(
        v.brand,
        v.model,
        v.vehicle_class,
        v.curb_weight,
        v.braking_distance,
        v.energy_consumption,
        v.range,
        "draft",
      );
    }
    console.log(`已导入 ${vehiclesData.length} 款车型数据`);

    console.log("开始计算所有车型的综合权衡分...");
    const scores = calculateAllScores();
    console.log(`已完成 ${scores.length} 款车型的评分计算！`);

    console.log("更新状态为 published...");
    db.prepare("UPDATE vehicles SET status = 'published'").run();

    console.log("重新计算分档统计数据...");
    recalculateClassStatistics();
    console.log("分档统计计算完成！");

    console.log("=== 自动初始化完成 ===");
  } else {
    const statsCount = db
      .prepare("SELECT COUNT(*) as count FROM class_statistics")
      .get().count;
    if (statsCount === 0) {
      console.log("检测到分档统计为空，重新计算...");
      recalculateClassStatistics();
      console.log("分档统计计算完成！");
    }
  }
}

autoInitialize();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "SafeBalance API 运行正常" });
});

app.use("/api/vehicles", vehiclesRoute);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "服务器内部错误" });
});

app.use((req, res) => {
  res.status(404).json({ error: "接口不存在" });
});

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║                                                          ║
  ║   SafeBalance 车重权衡评估平台 - 后端服务                ║
  ║                                                          ║
  ║   API 地址: http://localhost:${PORT}                       ║
  ║                                                          ║
  ║   基础接口:                                              ║
  ║   GET    /api/health                  健康检查           ║
  ║   GET    /api/vehicles                车型列表           ║
  ║   GET    /api/vehicles/:id            车型详情           ║
  ║   POST   /api/vehicles                新增车型           ║
  ║   PUT    /api/vehicles/:id            修改车型           ║
  ║   POST   /api/vehicles/:id/calculate  测算车型           ║
  ║   POST   /api/vehicles/:id/publish    发布车型           ║
  ║   GET    /api/vehicles/classes        重量分档           ║
  ║   GET    /api/vehicles/statistics     分档统计           ║
  ║   GET    /api/vehicles/tradeoff       权衡数据           ║
  ║                                                          ║
  ║   权重可调接口:                                          ║
  ║   GET    /api/vehicles/weights/default 获取默认权重      ║
  ║   POST   /api/vehicles/recalculate-with-weights 重算评分 ║
  ║   POST   /api/vehicles/tradeoff-with-weights 权衡数据    ║
  ║                                                          ║
  ║   批量导入审核接口:                                      ║
  ║   POST   /api/vehicles/batch-import     批量导入         ║
  ║   GET    /api/vehicles/pending-review   待审核列表       ║
  ║   GET    /api/vehicles/import-batches   导入批次         ║
  ║   POST   /api/vehicles/:id/review       单条审核         ║
  ║   POST   /api/vehicles/batch-review     批量审核         ║
  ║                                                          ║
  ║   多车对比接口:                                          ║
  ║   GET    /api/vehicles/compare/multi   多车型对比(2-4款) ║
  ║                                                          ║
  ╚══════════════════════════════════════════════════════════╝
  `);
});
