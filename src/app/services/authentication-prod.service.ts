import { Injectable, OnDestroy } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, tap, switchMap, catchError, of, throwError, map } from 'rxjs';
import { AuthenticatedUserRepository } from '../repositories/authenticated-user.repository';
import { EnvironmentService } from './environment.service';

const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      userId
      accessToken
      refreshToken
      userPreferences {
        userId
        defaultLang
      }
      isNewAccount
    }
  }
`;

const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      userId
      accessToken
      refreshToken
      userPreferences {
        userId
        defaultLang
      }
    }
  }
`;

const LOGOUT_MUTATION = gql`
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

const VALIDATE_TOKEN_MUTATION = gql`
  mutation validateToken($token: String!) {
    validateToken(token: $token) {
      userId
    }
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      uuid
      role
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class AuthenticationProdService implements OnDestroy {
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly REFRESH_INTERVAL = 13 * 60 * 1000; // 13 minutes (before 15min expiry)

  constructor(
    private readonly apollo: Apollo,
    private authUserRepo: AuthenticatedUserRepository,
    private envService: EnvironmentService
  ) {}

  ngOnDestroy(): void {
    this.clearRefreshTimeout();
  }

  sendLoginRequest(username: string, password: string): Observable<any> {
    return this.apollo
      .mutate({
        mutation: LOGIN_MUTATION,
        variables: { username, password },
      })
      .pipe(
        tap((result: any) => {
          if (result.data?.login) {
            const { accessToken, refreshToken, userId } = result.data.login;
            this.authUserRepo.saveProdTokens(accessToken, refreshToken, userId);
            this.scheduleRefresh();
          }
        }),
        // After login, fetch current user to get their role
        switchMap((loginResult: any) => {
          if (loginResult.data?.login) {
            return this.apollo.query({
              query: ME_QUERY,
              fetchPolicy: 'network-only',
            }).pipe(
              tap((meResult: any) => {
                if (meResult.data?.me?.role) {
                  this.authUserRepo.saveUserRole(meResult.data.me.role);
                }
              }),
              map(() => loginResult) // Return the original login result
            );
          }
          return of(loginResult);
        })
      );
  }

  confirmTokenValidity(token: string): Observable<any> {
    return this.apollo.mutate({
      mutation: VALIDATE_TOKEN_MUTATION,
      variables: { token },
    });
  }

  getUserRole(): string | null {
    return this.authUserRepo.getUserRole();
  }

  refreshAccessToken(): Observable<any> {
    const refreshToken = this.authUserRepo.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.apollo
      .mutate({
        mutation: REFRESH_TOKEN_MUTATION,
        variables: { refreshToken },
      })
      .pipe(
        tap((result: any) => {
          if (result.data?.refreshToken) {
            const { accessToken, refreshToken: newRefreshToken, userId } = result.data.refreshToken;
            this.authUserRepo.saveProdTokens(accessToken, newRefreshToken, userId);
            this.scheduleRefresh();
          }
        }),
        catchError((error) => {
          console.error('Token refresh failed:', error);
          this.logout().subscribe();
          return throwError(() => error);
        })
      );
  }

  logout(): Observable<any> {
    this.clearRefreshTimeout();
    const refreshToken = this.authUserRepo.getRefreshToken();

    if (refreshToken) {
      return this.apollo
        .mutate({
          mutation: LOGOUT_MUTATION,
          variables: { refreshToken },
        })
        .pipe(
          tap(() => {
            this.authUserRepo.clearToken();
          }),
          catchError((error) => {
            console.warn('Logout mutation failed:', error);
            this.authUserRepo.clearToken();
            return of(null);
          })
        );
    }

    this.authUserRepo.clearToken();
    return of(null);
  }

  private scheduleRefresh(): void {
    this.clearRefreshTimeout();

    this.refreshTimeout = setTimeout(() => {
      this.refreshAccessToken().subscribe({
        error: (err) => {
          console.error('Auto-refresh failed:', err);
        },
      });
    }, this.REFRESH_INTERVAL);
  }

  private clearRefreshTimeout(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Try to restore session from stored refresh token
   * Call this on app initialization
   */
  restoreSession(): Observable<boolean> {
    const refreshToken = this.authUserRepo.getRefreshToken();

    if (!refreshToken) {
      return of(false);
    }

    return this.refreshAccessToken().pipe(
      switchMap(() => of(true)),
      catchError(() => {
        this.authUserRepo.clearToken();
        return of(false);
      })
    );
  }

  /**
   * Check if we have a valid session (access token exists)
   */
  hasValidSession(): boolean {
    return this.authUserRepo.getAccessToken() !== null;
  }
}
