import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  userId: string;
  role: string;
  // Add other fields as needed
}

@Injectable({
  providedIn: 'root',
})
export class AuthenticatedUserRepository {
  private TOKEN_KEY = 'auth_token';
  private USER_ID_KEY = 'user_id';

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

  getUserRole(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const decoded = jwtDecode<JWTPayload>(token);
      return decoded.role || null;
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  clearToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_ID_KEY);
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}
