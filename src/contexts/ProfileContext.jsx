import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Create the Profile Context
const ProfileContext = createContext();

// Action types
const actionTypes = {
  SET_PROFILE: 'SET_PROFILE',
  SET_NAME: 'SET_NAME',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
};

// Initial state
const initialState = {
  profile: {
    name: 'Study Enthusiast', // Default name
    email: 'exam.buddy@no_email.com',
    createdAt: null,
    lastLogin: new Date().toISOString(),
  },
  loading: true,
  error: null,
};

// Reducer function
const profileReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_PROFILE:
      return {
        ...state,
        profile: { ...state.profile, ...action.payload },
        loading: false,
        error: null,
      };
    case actionTypes.SET_NAME:
      return {
        ...state,
        profile: { ...state.profile, name: action.payload },
        loading: false,
        error: null,
      };
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case actionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    default:
      return state;
  }
};

// Profile Provider component
export const ProfileProvider = ({ children }) => {
  const [state, dispatch] = useReducer(profileReducer, initialState);

  // Load profile from chrome.storage or localStorage
  useEffect(() => {
    const loadProfile = async () => {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      
      try {
        let profileData = null;
        
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // Use chrome.storage for extension
          const result = await new Promise((resolve) => {
            chrome.storage.local.get(['userProfile'], (res) => {
              resolve(res);
            });
          });
          
          if (result.userProfile) {
            profileData = result.userProfile;
          }
        } else {
          // Fallback to localStorage for development
          const storedProfile = localStorage.getItem('userProfile');
          if (storedProfile) {
            profileData = JSON.parse(storedProfile);
          }
        }
        
        if (profileData) {
          dispatch({ type: actionTypes.SET_PROFILE, payload: profileData });
        } else {
          // Use default profile if none exists
          const defaultProfile = {
            name: 'Study Enthusiast',
            email: 'exam.buddy@gmail.com',
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          dispatch({ type: actionTypes.SET_PROFILE, payload: defaultProfile });
          
          // Save default to storage
          if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ userProfile: defaultProfile });
          } else {
            localStorage.setItem('userProfile', JSON.stringify(defaultProfile));
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
      } finally {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      }
    };

    loadProfile();
  }, []);

  // Function to update profile name
  const updateProfileName = async (newName) => {
    dispatch({ type: actionTypes.SET_LOADING, payload: true });
    
    try {
      const updatedProfile = {
        ...state.profile,
        name: newName,
        lastLogin: new Date().toISOString(), // Update last login time
      };

      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Use chrome.storage for extension
        await new Promise((resolve, reject) => {
          chrome.storage.local.set({ userProfile: updatedProfile }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      } else {
        // Fallback to localStorage for development
        localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      }

      dispatch({ type: actionTypes.SET_PROFILE, payload: updatedProfile });
    } catch (error) {
      console.error('Error updating profile:', error);
      dispatch({ type: actionTypes.SET_ERROR, payload: error.message });
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false });
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        ...state,
        updateProfileName,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

// Custom hook to use the Profile Context
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};