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
        const token = authUserRepo.getToken();

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
            uri: 'https://api.my-twin.io/graphql',
          }),
        ]),
        cache: new InMemoryCache(),
      };
    }),
  ],
};
