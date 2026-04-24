/**
 * Centralized Data Service
 * Single source of truth for all data operations
 * Switch between mock and real backend by changing one flag
 */

import * as mockAPI from './backendAPI';  // Your mock data
// import * as supabaseAPI from './supabaseAPI';  // Real backend (Phase 2)

// Import hardcoded data (will be replaced with backend calls)
import { quizCategories } from '../data/quizCategories';
import { 
  continueStudyingData, 
  recentlyViewedData, 
  examCategoriesData,
  studyPackagesData,
  testimonialsData,
  currentUser,
  dailyStats
} from '../data/homeData';

// ============================================================================
// CONFIGURATION - Change this ONE flag to switch backends
// ============================================================================

const USE_MOCK_DATA = true;  // Set to false when Supabase is ready

// ============================================================================
// DATA SERVICE - All pages use these functions
// ============================================================================

/**
 * Get all quizzes with optional filters
 */
export async function getQuizzes(filters = {}) {
  if (USE_MOCK_DATA) {
    return mockAPI.fetchQuizzes(filters);
  }
  // return supabaseAPI.fetchQuizzes(filters);  // Phase 2
}

/**
 * Get single quiz by slug
 */
export async function getQuizBySlug(slug) {
  if (USE_MOCK_DATA) {
    return mockAPI.fetchQuizBySlug(slug);
  }
  // return supabaseAPI.fetchQuizBySlug(slug);  // Phase 2
}

/**
 * Get featured/trending quizzes for landing page
 */
export async function getFeaturedQuizzes(limit = 6) {
  if (USE_MOCK_DATA) {
    const response = await mockAPI.fetchQuizzes({});
    return {
      success: true,
      data: response.data.slice(0, limit)
    };
  }
  // return supabaseAPI.getFeaturedQuizzes(limit);  // Phase 2
}

/**
 * Search quizzes by query
 */
export async function searchQuizzes(query) {
  if (USE_MOCK_DATA) {
    return mockAPI.fetchQuizzes({ search: query });
  }
  // return supabaseAPI.searchQuizzes(query);  // Phase 2
}

/**
 * Get quiz categories
 */
export async function getCategories() {
  if (USE_MOCK_DATA) {
    return mockAPI.getCategories();
  }
  // return supabaseAPI.getCategories();  // Phase 2
}

/**
 * Get quiz subjects
 */
export async function getSubjects() {
  if (USE_MOCK_DATA) {
    return mockAPI.getSubjects();
  }
  // return supabaseAPI.getSubjects();  // Phase 2
}

/**
 * Get quiz statistics (for landing page)
 */
export async function getQuizStats() {
  if (USE_MOCK_DATA) {
    return {
      success: true,
      data: {
        totalQuizzes: 10,
        totalQuestions: 350,
        totalUsers: 1250,
        averageRating: 4.8
      }
    };
  }
  // return supabaseAPI.getQuizStats();  // Phase 2
}

/**
 * Get recent quizzes
 */
export async function getRecentQuizzes(limit = 5) {
  if (USE_MOCK_DATA) {
    const response = await mockAPI.fetchQuizzes({});
    return {
      success: true,
      data: response.data.slice(0, limit)
    };
  }
  // return supabaseAPI.getRecentQuizzes(limit);  // Phase 2
}

/**
 * Get popular quizzes
 */
export async function getPopularQuizzes(limit = 5) {
  if (USE_MOCK_DATA) {
    const response = await mockAPI.fetchQuizzes({ difficulty: 'medium' });
    return {
      success: true,
      data: response.data.slice(0, limit)
    };
  }
  // return supabaseAPI.getPopularQuizzes(limit);  // Phase 2
}

// ============================================================================
// HOME PAGE DATA - Currently hardcoded, will move to backend
// ============================================================================

/**
 * Get quiz categories with quizzes (for quiz browser)
 */
export function getQuizCategories() {
  if (USE_MOCK_DATA) {
    return quizCategories;
  }
  // return supabaseAPI.getQuizCategories();  // Phase 2
}

/**
 * Get continue studying data (paused/in-progress quizzes)
 */
export function getContinueStudyingData() {
  if (USE_MOCK_DATA) {
    return continueStudyingData;
  }
  // return supabaseAPI.getContinueStudyingData(userId);  // Phase 2
}

/**
 * Get recently viewed quizzes
 */
export function getRecentlyViewedData() {
  if (USE_MOCK_DATA) {
    return recentlyViewedData;
  }
  // return supabaseAPI.getRecentlyViewedData(userId);  // Phase 2
}

/**
 * Get exam categories (Step 1, Step 2, Step 3)
 */
export function getExamCategories() {
  if (USE_MOCK_DATA) {
    return examCategoriesData;
  }
  // return supabaseAPI.getExamCategories();  // Phase 2
}

/**
 * Get study packages
 */
export function getStudyPackages() {
  if (USE_MOCK_DATA) {
    return studyPackagesData;
  }
  // return supabaseAPI.getStudyPackages();  // Phase 2
}

/**
 * Get testimonials
 */
export function getTestimonials() {
  if (USE_MOCK_DATA) {
    return testimonialsData;
  }
  // return supabaseAPI.getTestimonials();  // Phase 2
}

/**
 * Get current user data
 */
export function getCurrentUser() {
  if (USE_MOCK_DATA) {
    return currentUser;
  }
  // return supabaseAPI.getCurrentUser();  // Phase 2
}

/**
 * Get daily stats for current user
 */
export function getDailyStats() {
  if (USE_MOCK_DATA) {
    return dailyStats;
  }
  // return supabaseAPI.getDailyStats(userId);  // Phase 2
}

// ============================================================================
// FUTURE: User Authentication (Phase 3)
// ============================================================================

export async function login(email, password) {
  if (USE_MOCK_DATA) {
    return { success: false, error: 'Authentication not available in mock mode' };
  }
  // return supabaseAPI.login(email, password);  // Phase 3
}

export async function signup(email, password) {
  if (USE_MOCK_DATA) {
    return { success: false, error: 'Authentication not available in mock mode' };
  }
  // return supabaseAPI.signup(email, password);  // Phase 3
}

// ============================================================================
// FUTURE: User Progress (Phase 3)
// ============================================================================

export async function saveQuizAttempt(userId, quizId, score, timeSpent) {
  if (USE_MOCK_DATA) {
    console.log('Mock: Quiz attempt saved locally');
    return { success: true };
  }
  // return supabaseAPI.saveQuizAttempt(userId, quizId, score, timeSpent);  // Phase 3
}

export async function getUserStats(userId) {
  if (USE_MOCK_DATA) {
    return {
      success: true,
      data: {
        quizzesTaken: 0,
        averageScore: 0,
        totalTimeSpent: 0
      }
    };
  }
  // return supabaseAPI.getUserStats(userId);  // Phase 3
}

// ============================================================================
// Export configuration for debugging
// ============================================================================

export const config = {
  usingMockData: USE_MOCK_DATA,
  backendType: USE_MOCK_DATA ? 'mock' : 'supabase'
};
