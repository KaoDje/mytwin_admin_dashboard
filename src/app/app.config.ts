import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { ApolloLink, InMemoryCache, Observable as ApolloObservable, FetchResult } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { routes } from './app.routes';
import { AuthenticatedUserRepository } from './repositories/authenticated-user.repository';

// Angular Material providers
import { MAT_RIPPLE_GLOBAL_OPTIONS } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

// Environment URLs configuration
const ENVIRONMENT_URLS = {
  dev: 'https://api.my-twin.io/graphql',
  prod: 'https://mytwin-backend.osc-fr1.scalingo.io/graphql',
};

function getGraphqlUrl(): string {
  const storedEnv = localStorage.getItem('selected_environment');
  if (storedEnv === 'prod') {
    return ENVIRONMENT_URLS.prod;
  }
  return ENVIRONMENT_URLS.dev;
}

function isProdEnvironment(): boolean {
  return localStorage.getItem('selected_environment') === 'prod';
}

// Refresh token function (standalone, not using Angular DI)
async function refreshTokenRequest(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(getGraphqlUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation RefreshToken($refreshToken: String!) {
            refreshToken(refreshToken: $refreshToken) {
              accessToken
              refreshToken
            }
          }
        `,
        variables: { refreshToken },
      }),
    });

    const result = await response.json();

    if (result.data?.refreshToken) {
      return {
        accessToken: result.data.refreshToken.accessToken,
        refreshToken: result.data.refreshToken.refreshToken,
      };
    }
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),

    // Material Design providers
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' },
    },
    {
      provide: MAT_RIPPLE_GLOBAL_OPTIONS,
      useValue: { disabled: false },
    },

    // Configuration Apollo
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const authUserRepo = inject(AuthenticatedUserRepository);
      const router = inject(Router);

      // Middleware pour ajouter le token JWT
      const authMiddleware = new ApolloLink((operation, forward) => {
        const token = authUserRepo.getCurrentToken();

        if (token) {
          operation.setContext(({ headers = {} }) => ({
            headers: {
              ...headers,
              Authorization: `Bearer ${token}`,
            },
          }));
        }

        return forward(operation);
      });

      // Track if we're currently refreshing to avoid multiple refresh calls
      let isRefreshing = false;
      let refreshPromise: Promise<any> | null = null;

      // Error link pour gérer le refresh token automatique (prod only)
      const errorLink = onError((errorResponse: any) => {
        const { graphQLErrors, networkError, operation, forward } = errorResponse;

        if (graphQLErrors) {
          for (const err of graphQLErrors) {
            console.log('[Apollo Error]', err.message, err.extensions);

            const isAuthError =
              err.extensions?.['code'] === 'UNAUTHENTICATED' ||
              err.message?.toLowerCase().includes('authentication') ||
              err.message?.toLowerCase().includes('unauthorized');

            if (isAuthError && isProdEnvironment()) {
              console.log('[Apollo] Auth error detected, attempting refresh...');

              // Try to refresh the token
              return new ApolloObservable<FetchResult>((observer) => {
                // If already refreshing, wait for that to complete
                if (isRefreshing && refreshPromise) {
                  refreshPromise.then((tokens) => {
                    if (tokens) {
                      operation.setContext(({ headers = {} }: any) => ({
                        headers: {
                          ...headers,
                          Authorization: `Bearer ${tokens.accessToken}`,
                        },
                      }));
                      forward(operation).subscribe(observer);
                    } else {
                      observer.error(err);
                    }
                  }).catch(() => observer.error(err));
                  return;
                }

                isRefreshing = true;
                refreshPromise = refreshTokenRequest();

                refreshPromise
                  .then((tokens) => {
                    isRefreshing = false;
                    if (tokens) {
                      console.log('[Apollo] Token refreshed successfully');
                      // Save new tokens
                      localStorage.setItem('access_token', tokens.accessToken);
                      localStorage.setItem('refresh_token', tokens.refreshToken);

                      // Retry the failed request with new token
                      operation.setContext(({ headers = {} }: any) => ({
                        headers: {
                          ...headers,
                          Authorization: `Bearer ${tokens.accessToken}`,
                        },
                      }));

                      // Retry the request
                      forward(operation).subscribe(observer);
                    } else {
                      console.log('[Apollo] Refresh failed, redirecting to login');
                      // Refresh failed - clear tokens and redirect to login
                      authUserRepo.clearToken();
                      router.navigate(['/login']);
                      observer.error(err);
                    }
                  })
                  .catch((refreshError) => {
                    isRefreshing = false;
                    console.error('[Apollo] Refresh error:', refreshError);
                    authUserRepo.clearToken();
                    router.navigate(['/login']);
                    observer.error(refreshError);
                  });
              });
            }
          }
        }

        if (networkError) {
          console.error('[Network error]:', networkError);
        }

        return;
      });

      return {
        link: ApolloLink.from([
          errorLink,
          authMiddleware,
          httpLink.create({
            uri: getGraphqlUrl(),
          }),
        ]),
        cache: new InMemoryCache(),
      };
    }),
  ],
};
