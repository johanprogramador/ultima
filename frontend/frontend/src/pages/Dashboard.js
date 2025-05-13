import React from 'react';
import SidebarMenu from '../components/SidebarMenu';
import DashboardContent from '../components/Dashboardcard';
import Grafica from '../components/Grafica';
import DowntimeCharts from '../components/DowntimeCharts';
import InactivityHandler from '../components/InactivityHandler';
import '../styles/Dashboard.css';


const Dashboard = () => {




  return (
    <>
      <InactivityHandler />
      <SidebarMenu />
      <div className="main-container">
        <div className="dashboard-container">
          <DashboardContent />
          <div className="chart-and-stats-container">
            <Grafica />
          </div>
          {/* Nuevo contenedor para DowntimeCharts y CustomLineChart */}
          <div className="charts-row">
            <DowntimeCharts />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;