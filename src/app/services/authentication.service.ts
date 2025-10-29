import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, tap } from 'rxjs';
import { AuthenticatedUserRepository } from '../repositories/authenticated-user.repository';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  constructor(
    private readonly apollo: Apollo,
    private authUserRepo: AuthenticatedUserRepository
  ) {}

  sendLoginRequest(username: string, password: string): Observable<any> {
    const LOGIN = gql`
      mutation login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          userId
          jwt
          userPreferences {
            defaultLang
          }
          isNewAccount
        }
      }
    `;
    return this.apollo
      .mutate({
        mutation: LOGIN,
        variables: { username, password },
      })
      .pipe(
        tap((result: any) => {
          if (result.data?.login) {
            this.authUserRepo.saveToken(result.data.login.jwt);
            this.authUserRepo.saveUserId(result.data.login.userId);
          }
        })
      );
  }

  confirmTokenValidity(token: string): Observable<any> {
    const VALIDATE_TOKEN = gql`
      mutation validateToken($token: String!) {
        validateToken(token: $token) {
          userId
        }
      }
    `;

    return this.apollo.mutate({
      mutation: VALIDATE_TOKEN,
      variables: { token },
    });
  }

  getUserRole(): string | null {
    return this.authUserRepo.getUserRole();
  }
}
