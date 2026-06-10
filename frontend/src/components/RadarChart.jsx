import ReactECharts from 'echarts-for-react';

function RadarChart({ vehicle, height = 300 }) {
  if (!vehicle) return null;

  const option = {
    tooltip: {
      trigger: 'item',
    },
    radar: {
      indicator: [
        { name: '轻量化得分', max: 100 },
        { name: '避险能力', max: 100 },
        { name: '能耗经济性', max: 100 },
      ],
      shape: 'polygon',
      splitNumber: 4,
      axisName: {
        color: '#475569',
        fontSize: 12,
      },
      splitLine: {
        lineStyle: {
          color: ['#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'],
        },
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(59, 130, 246, 0.05)', 'rgba(59, 130, 246, 0.1)'],
        },
      },
      axisLine: {
        lineStyle: {
          color: '#cbd5e1',
        },
      },
    },
    series: [
      {
        name: vehicle.brand + ' ' + vehicle.model,
        type: 'radar',
        data: [
          {
            value: [
              vehicle.weight_score || 0,
              vehicle.evasion_score || 0,
              vehicle.energy_score || 0,
            ],
            name: '综合权衡',
            symbol: 'circle',
            symbolSize: 6,
            lineStyle: {
              color: '#3b82f6',
              width: 2,
            },
            areaStyle: {
              color: 'rgba(59, 130, 246, 0.3)',
            },
            itemStyle: {
              color: '#3b82f6',
            },
          },
        ],
      },
    ],
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
}

export default RadarChart;
