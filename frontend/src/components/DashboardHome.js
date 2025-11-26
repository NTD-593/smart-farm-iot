import React from 'react';
import SensorDisplay from './SensorDisplay';
import DeviceControl from './DeviceControl';
import SensorChart from './SensorChart';

const DashboardHome = () => {
  return (
    <>
      <SensorDisplay />
      <DeviceControl />
      <SensorChart />
    </>
  );
};

export default DashboardHome;
