import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import VehicleList from './pages/VehicleList';
import VehicleDetail from './pages/VehicleDetail';
import TradeoffChart from './pages/TradeoffChart';
import VehicleCompare from './pages/VehicleCompare';
import VehicleManage from './pages/VehicleManage';
import VehicleReview from './pages/VehicleReview';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/vehicles" replace />} />
        <Route path="vehicles" element={<VehicleList />} />
        <Route path="vehicles/:id" element={<VehicleDetail />} />
        <Route path="tradeoff" element={<TradeoffChart />} />
        <Route path="compare" element={<VehicleCompare />} />
        <Route path="manage" element={<VehicleManage />} />
        <Route path="review" element={<VehicleReview />} />
      </Route>
    </Routes>
  );
}

export default App;
