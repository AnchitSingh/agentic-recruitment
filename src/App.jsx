import React from 'react';
import { Toaster } from 'react-hot-toast';
import { ProfileProvider } from './contexts/ProfileContext';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes';
import KofiButton from './components/ui/KofiButton';
import { dumpAnonData } from './lib/anonTracker';
import './index.css';

// Call once on app load
dumpAnonData();

const App = () => {
  return (
    <AuthProvider>
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
        <KofiButton />
      </ProfileProvider>
    </AuthProvider>
  );
};

export default App;
