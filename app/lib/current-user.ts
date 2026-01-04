export type CurrentUser = {
  name: string;
  email: string;
  avatar: string;
  role: 'student' | 'parent' | 'advisor';
};

export const CURRENT_USER_STORAGE_KEY = 'vectoriusCurrentUser';

export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearCurrentUser() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
}
