import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserType } from '../types/user';

type AuthListener = () => void;

class AuthStore {
  private token: string | null = null;
  private user: User | null = null;
  private listeners: AuthListener[] = [];

  async init() {
    this.token = await AsyncStorage.getItem('auth_token');
    const userData = await AsyncStorage.getItem('auth_user');
    this.user = userData ? JSON.parse(userData) : null;
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  getUserType(): UserType | null {
    return this.user?.user_type || null;
  }

  async setAuth(token: string, user: User): Promise<void> {
    this.token = token;
    this.user = user;
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
  }

  async clearAuth(): Promise<void> {
    this.token = null;
    this.user = null;
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    this.listeners.forEach(fn => fn());
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  /** Subscribe to logout events (e.g. 401 interceptor). Returns unsubscribe fn. */
  onLogout(fn: AuthListener): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }
}

export const authStore = new AuthStore();
