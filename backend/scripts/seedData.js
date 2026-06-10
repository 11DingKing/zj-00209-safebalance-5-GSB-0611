const db = require("../config/database");
const vehiclesData = require("../data/vehiclesData");
const {
  calculateAllScores,
  recalculateClassStatistics,
} = require("../services/scoringService");

const insertStmt = db.prepare(`
  INSERT INTO vehicles (
    brand, model, vehicle_class, curb_weight, braking_distance,
    energy_consumption, range, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const transaction = db.transaction((vehicles) => {
  for (const v of vehicles) {
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
});

console.log(`开始导入 ${vehiclesData.length} 款车型数据...`);
transaction(vehiclesData);
console.log(`成功导入 ${vehiclesData.length} 款车型数据！`);

console.log("开始计算所有车型的综合权衡分...");
const scores = calculateAllScores();
console.log(`已完成 ${scores.length} 款车型的评分计算！`);

console.log("更新状态为 published...");
db.prepare("UPDATE vehicles SET status = 'published'").run();

console.log("重新计算分档统计数据...");
recalculateClassStatistics();
console.log("分档统计计算完成！");

console.log("");
console.log("=== 数据初始化完成 ===");
console.log("已导入车型数量:", vehiclesData.length);

const stats = db
  .prepare(
    `
  SELECT weight_class, COUNT(*) as count, 
         ROUND(AVG(total_score), 2) as avg_score
  FROM vehicles 
  GROUP BY weight_class 
  ORDER BY MIN(curb_weight)
`,
  )
  .all();

console.log("");
console.log("重量分档统计:");
for (const s of stats) {
  console.log(`  ${s.weight_class}: ${s.count} 款，平均权衡分 ${s.avg_score}`);
}

const top5 = db
  .prepare(
    `
  SELECT brand, model, curb_weight, total_score, evasion_score, energy_score
  FROM vehicles 
  ORDER BY total_score DESC 
  LIMIT 5
`,
  )
  .all();

console.log("");
console.log("权衡排行榜 TOP5:");
top5.forEach((v, i) => {
  console.log(
    `  ${i + 1}. ${v.brand} ${v.model} - 重量:${v.curb_weight}kg 总分:${v.total_score}`,
  );
});
