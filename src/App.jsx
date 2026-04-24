import React from 'react';
import { Toaster } from 'react-hot-toast';
import { ProfileProvider } from './contexts/ProfileContext';
import AppRoutes from './routes';
import './index.css';



const App = () => {
  return (
    <ProfileProvider>
      <Toaster position="top-right" toastOptions={{
        duration: 3000,
        style: {
          background: '#fff',
          color: '#333',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        },
      }} containerStyle={{
        zIndex: 99999,
      }} />
      
      <AppRoutes />
    </ProfileProvider>
  );
};

export default App;
