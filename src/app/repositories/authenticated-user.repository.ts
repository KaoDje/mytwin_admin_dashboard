import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  userId: string;
  role: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthenticatedUserRepository {
  // Dev environment keys (legacy)
  private TOKEN_KEY = 'auth_token';
  private USER_ID_KEY = 'user_id';

  // Prod environment keys (new system)
  private ACCESS_TOKEN_KEY = 'access_token';
  private REFRESH_TOKEN_KEY = 'refresh_token';
  private USER_ROLE_KEY = 'user_role';

  // ==================== DEV (Legacy) Methods ====================

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  saveUserId(userId: string): void {
    localStorage.setItem(this.USER_ID_KEY, userId);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUserId(): string | null {
    return localStorage.getItem(this.USER_ID_KEY);
  }

  // ==================== PROD (New System) Methods ====================

  saveAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  saveRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  saveProdTokens(accessToken: string, refreshToken: string, userId: string, role?: string): void {
    this.saveAccessToken(accessToken);
    this.saveRefreshToken(refreshToken);
    this.saveUserId(userId);
    if (role) {
      this.saveUserRole(role);
    }
  }

  saveUserRole(role: string): void {
    localStorage.setItem(this.USER_ROLE_KEY, role);
  }

  getStoredUserRole(): string | null {
    return localStorage.getItem(this.USER_ROLE_KEY);
  }

  clearProdTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.USER_ROLE_KEY);
  }

  // ==================== Common Methods ====================

  getUserRole(): string | null {
    // First check if we have a stored role (for prod environment)
    const storedRole = this.getStoredUserRole();
    if (storedRole) {
      return storedRole;
    }

    // Try to extract from JWT (for dev environment)
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const decoded = jwtDecode<JWTPayload>(token);
      return decoded.role || null;
    } catch (error) {
      console.error('[Auth] Error decoding JWT:', error);
      return null;
    }
  }

  clearToken(): void {
    // Clear both dev and prod tokens
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_ROLE_KEY);
  }

  isAuthenticated(): boolean {
    // Check both token types
    return this.getToken() !== null || this.getAccessToken() !== null;
  }

  /**
   * Get the current active token (for API calls)
   * Returns access token (prod) or legacy token (dev)
   */
  getCurrentToken(): string | null {
    return this.getAccessToken() || this.getToken();
  }
}
