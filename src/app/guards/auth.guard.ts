import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticatedUserRepository } from '../repositories/authenticated-user.repository';
import { AuthenticationService } from '../services/authentication.service';
import { AuthenticationProdService } from '../services/authentication-prod.service';
import { EnvironmentService } from '../services/environment.service';

export const authGuard: CanActivateFn = async () => {
  const authUserRepo = inject(AuthenticatedUserRepository);
  const authService = inject(AuthenticationService);
  const authProdService = inject(AuthenticationProdService);
  const envService = inject(EnvironmentService);
  const router = inject(Router);

  const isProd = envService.getEnvironment() === 'prod';

  // Get the appropriate token based on environment
  const token = isProd
    ? authUserRepo.getAccessToken()
    : authUserRepo.getToken();

  // No token, redirect to login
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  try {
    // For prod environment, try to refresh token if needed
    if (isProd) {
      // First try to validate the current token
      try {
        const result = await firstValueFrom(
          authProdService.confirmTokenValidity(token)
        );

        if (result.data?.validateToken?.userId) {
          const role = authProdService.getUserRole();

          if (role === 'admin') {
            return true;
          } else {
            authUserRepo.clearToken();
            router.navigate(['/login']);
            return false;
          }
        }
      } catch (validationError) {
        // Token might be expired, try to refresh
        try {
          await firstValueFrom(authProdService.refreshAccessToken());

          // After refresh, check the role
          const role = authProdService.getUserRole();
          if (role === 'admin') {
            return true;
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect
          console.error('Token refresh failed:', refreshError);
          authUserRepo.clearToken();
          router.navigate(['/login']);
          return false;
        }
      }
    } else {
      // Dev environment - original logic
      const result = await firstValueFrom(
        authService.confirmTokenValidity(token)
      );

      if (result.data?.validateToken?.userId) {
        const role = authService.getUserRole();

        if (role === 'admin') {
          return true;
        } else {
          authUserRepo.clearToken();
          router.navigate(['/login']);
          return false;
        }
      }
    }

    // Invalid token
    authUserRepo.clearToken();
    router.navigate(['/login']);
    return false;
  } catch (error) {
    console.error('Token validation error:', error);
    authUserRepo.clearToken();
    router.navigate(['/login']);
    return false;
  }
};
