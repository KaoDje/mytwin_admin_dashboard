import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import {
  CreateUserInput,
  UpdateUserInput,
  UpdateUserPreferencesInput,
} from '../dtos/user.dto';
import { User } from '../entities/user.entity';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private apollo: Apollo) {}

  getAllUsers(): Observable<any> {
    const GET_USERS = gql`
      query GetUsers {
        users {
          uuid
          username
          role
          preferences {
            defaultLang
            appViewId
            appView {
              uuid
              name
              applications {
                id
                order
              }
              profile {
                id
                order
              }
            }
          }
        }
      }
    `;

    return this.apollo.watchQuery<any>({
      query: GET_USERS,
      fetchPolicy: 'cache-and-network',
    }).valueChanges;
  }

  getUser(uuid: string): Observable<any> {
    const GET_USER = gql`
      query GetUser($uuid: String!) {
        user(uuid: $uuid) {
          uuid
          username
          role
          preferences {
            defaultLang
            appViewId
            appView {
              uuid
              name
              applications {
                id
                order
              }
              profile {
                id
                order
              }
            }
          }
        }
      }
    `;

    return this.apollo.watchQuery<any>({
      query: GET_USER,
      variables: { uuid },
      fetchPolicy: 'cache-and-network',
    }).valueChanges;
  }

  createUser(input: CreateUserInput): Observable<any> {
    const CREATE_USER = gql`
      mutation CreateUser($input: CreateUserInput!) {
        createUser(createUserInput: $input) {
          uuid
          username
          role
          preferences {
            defaultLang
            appViewId
          }
        }
      }
    `;

    return this.apollo.mutate<any>({
      mutation: CREATE_USER,
      variables: { input },
      refetchQueries: [
        {
          query: gql`
            query GetUsers {
              users {
                uuid
                username
                role
                preferences {
                  defaultLang
                  appViewId
                  appView {
                    uuid
                    name
                    applications {
                      id
                      order
                    }
                    profile {
                      id
                      order
                    }
                  }
                }
              }
            }
          `,
        },
      ],
    });
  }

  updateUser(input: UpdateUserInput): Observable<any> {
    const UPDATE_USER = gql`
      mutation UpdateUser($input: UpdateUserInput!) {
        updateUser(updateUserInput: $input) {
          uuid
          username
        }
      }
    `;

    return this.apollo.mutate<any>({
      mutation: UPDATE_USER,
      variables: { input },
      refetchQueries: [
        {
          query: gql`
            query GetUsers {
              users {
                uuid
                username
                role
                preferences {
                  defaultLang
                  appViewId
                  appView {
                    uuid
                    name
                    applications {
                      id
                      order
                    }
                    profile {
                      id
                      order
                    }
                  }
                }
              }
            }
          `,
        },
      ],
    });
  }

  deleteUser(uuid: string): Observable<any> {
    const DELETE_USER = gql`
      mutation DeleteUser($uuid: String!) {
        deleteUser(uuid: $uuid)
      }
    `;

    return this.apollo.mutate<any>({
      mutation: DELETE_USER,
      variables: { uuid },
      refetchQueries: [
        {
          query: gql`
            query GetUsers {
              users {
                uuid
                username
                role
                preferences {
                  defaultLang
                  appViewId
                  appView {
                    uuid
                    name
                    applications {
                      id
                      order
                    }
                    profile {
                      id
                      order
                    }
                  }
                }
              }
            }
          `,
        },
      ],
    });
  }
}
