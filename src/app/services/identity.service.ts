import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { CreateIdentityInput, UpdateIdentityInput } from '../dtos/identity.dto';

@Injectable({
  providedIn: 'root',
})
export class IdentityService {
  constructor(private apollo: Apollo) {}

  createIdentity(input: CreateIdentityInput, userId: string): Observable<any> {
    const CREATE_IDENTITY = gql`
      mutation CreateIdentity($input: CreateIdentityInput!, $userId: String) {
        createIdentity(createIdentityInput: $input, userId: $userId) {
          uuid
          userId
          firstName
          lastName
          birthDate
          birthCity
          city
          country
          biologicalSex
        }
      }
    `;

    return this.apollo.mutate<any>({
      mutation: CREATE_IDENTITY,
      variables: { input, userId },
    });
  }

  updateIdentity(uuid: string, input: UpdateIdentityInput): Observable<any> {
    const UPDATE_IDENTITY = gql`
      mutation UpdateIdentity($uuid: String!, $input: UpdateIdentityInput!) {
        updateIdentity(uuid: $uuid, updateIdentityInput: $input) {
          uuid
          userId
          firstName
          lastName
          birthDate
          birthCity
          city
          country
          biologicalSex
        }
      }
    `;

    return this.apollo.mutate<any>({
      mutation: UPDATE_IDENTITY,
      variables: { uuid, input },
    });
  }

  deleteIdentity(uuid: string): Observable<any> {
    const DELETE_IDENTITY = gql`
      mutation DeleteIdentity($uuid: String!) {
        deleteIdentity(uuid: $uuid)
      }
    `;

    return this.apollo.mutate<any>({
      mutation: DELETE_IDENTITY,
      variables: { uuid },
    });
  }
}
