// Define the base URL for the backend API
export const API_BASE_URL = 'http://localhost:5000/api';

// Helper to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// --- AUTH API ---

export const registerUser = async (userData: any) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || 'Registration failed');
  }
  return response.json();
};

export const loginUser = async (credentials: any) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.msg || 'Login failed');
  }
  return response.json();
};

// --- USER DATA API ---

export const fetchUserData = async () => {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  if (!response.ok) return null;
  return response.json();
};

export const checkAndUpdateStreak = async () => {
  const response = await fetch(`${API_BASE_URL}/users/streak`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!response.ok) throw new Error('Failed to update streak');
  return response.json();
};

export const saveTopicCompletion = async (params: any) => {
  const response = await fetch(`${API_BASE_URL}/users/progress`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(params)
  });
  if (!response.ok) throw new Error('Failed to save progress');
  return response.json();
};

export const recordBattleWin = async () => {
    const response = await fetch(`${API_BASE_URL}/users/battle-win`, {
        method: 'POST',
        headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to update battle stats');
    return response.json();
};

export const getLeaderboard = async (filter: 'xp' | 'streak' | 'puzzlesSolved' = 'xp') => {
  const response = await fetch(`${API_BASE_URL}/users/leaderboard?filter=${filter}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Failed to fetch leaderboard');
  return response.json();
};

export const recordPuzzleWin = async (xp: number, title: string) => {
  const response = await fetch(`${API_BASE_URL}/users/puzzle-win`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ xp, title })
  });
  if (!response.ok) throw new Error('Failed to record puzzle win');
  return response.json();
};
