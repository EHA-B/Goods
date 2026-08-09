export type SessionUser = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  isActive: boolean;
  last_login: string | null;
};

let currentUser: SessionUser | null = null;

export function setCurrentUser(user: SessionUser) {
  currentUser = { ...user };
  return currentUser;
}

export function getCurrentUser() {
  return currentUser ? { ...currentUser } : null;
}

export function clearCurrentUser() {
  currentUser = null;
}
