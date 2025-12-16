import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, inject } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { ApolloLink, InMemoryCache } from '@apollo/client/core';
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
        // Use getCurrentToken which handles both dev (jwt) and prod (accessToken)
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

      return {
        link: ApolloLink.from([
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
