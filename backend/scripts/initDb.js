const fs = require("fs");
const path = require("path");
const db = require("../config/database");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

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

  CREATE TABLE IF NOT EXISTS weight_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    weight_value REAL NOT NULL,
    evasion_value REAL NOT NULL,
    energy_value REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
  CREATE INDEX IF NOT EXISTS idx_vehicles_class ON vehicles(vehicle_class);
  CREATE INDEX IF NOT EXISTS idx_vehicles_weight_class ON vehicles(weight_class);
  CREATE INDEX IF NOT EXISTS idx_vehicles_score ON vehicles(total_score);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_presets_name ON weight_presets(name);
`);

const weightClasses = [
  { name: "轻型车", min: 0, max: 1500, description: "整备质量 1500kg 以下" },
  { name: "紧凑型", min: 1500, max: 1800, description: "整备质量 1500-1800kg" },
  { name: "中型车", min: 1800, max: 2100, description: "整备质量 1800-2100kg" },
  { name: "中大型", min: 2100, max: 2500, description: "整备质量 2100-2500kg" },
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

console.log("数据库初始化完成！");
console.log("重量分档已创建：");
for (const wc of weightClasses) {
  console.log(`  ${wc.name}: ${wc.min}-${wc.max}kg`);
}
