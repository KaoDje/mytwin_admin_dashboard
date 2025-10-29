import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthenticatedUserRepository } from '../repositories/authenticated-user.repository';
import { AuthenticationService } from '../services/authentication.service';

export const authGuard: CanActivateFn = async () => {
  const authUserRepo = inject(AuthenticatedUserRepository);
  const authService = inject(AuthenticationService);
  const router = inject(Router);

  const token = authUserRepo.getToken();

  // No token, redirect to login
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  try {
    // Validate token with backend
    const result = await firstValueFrom(
      authService.confirmTokenValidity(token)
    );

    // Check if validation was successful
    if (result.data?.validateToken?.userId) {
      // Check if user has admin role
      const role = authService.getUserRole();

      if (role === 'admin') {
        return true;
      } else {
        // User exists but is not admin
        authUserRepo.clearToken();
        router.navigate(['/login']);
        return false;
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
