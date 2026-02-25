import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import Overview from './pages/Overview';
import QuoteSimulator from './pages/QuoteSimulator';
import Portfolio from './pages/Portfolio';
import ModelData from './pages/ModelData';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/quote" element={<QuoteSimulator />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/model" element={<ModelData />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
