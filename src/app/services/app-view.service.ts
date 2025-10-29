import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { CreateAppViewInput, UpdateAppViewInput } from '../dtos/app-view.dto';
import { AppView } from '../entities/app-view.entity';

@Injectable({
  providedIn: 'root',
})
export class AppViewService {
  constructor(private apollo: Apollo) {}

  getAllAppViews(): Observable<any> {
    const GET_APP_VIEWS = gql`
      query GetAppViews {
        appViews {
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
    `;

    return this.apollo.watchQuery<any>({
      query: GET_APP_VIEWS,
      fetchPolicy: 'cache-and-network',
    }).valueChanges;
  }

  getAppView(uuid: string): Observable<any> {
    const GET_APP_VIEW = gql`
      query GetAppView($uuid: String!) {
        appView(uuid: $uuid) {
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
    `;

    return this.apollo.watchQuery<any>({
      query: GET_APP_VIEW,
      variables: { uuid },
      fetchPolicy: 'cache-and-network',
    }).valueChanges;
  }

  createAppView(input: CreateAppViewInput): Observable<any> {
    const CREATE_APP_VIEW = gql`
      mutation CreateAppView($input: CreateAppViewInput!) {
        createAppView(input: $input) {
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
    `;

    return this.apollo.mutate<any>({
      mutation: CREATE_APP_VIEW,
      variables: { input },
      refetchQueries: [
        {
          query: gql`
            query GetAppViews {
              appViews {
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
          `,
        },
      ],
    });
  }

  updateAppView(uuid: string, input: UpdateAppViewInput): Observable<any> {
    const UPDATE_APP_VIEW = gql`
      mutation UpdateAppView($uuid: String!, $input: UpdateAppViewInput!) {
        updateAppView(uuid: $uuid, input: $input) {
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
    `;

    return this.apollo.mutate<any>({
      mutation: UPDATE_APP_VIEW,
      variables: { uuid, input },
      refetchQueries: [
        {
          query: gql`
            query GetAppViews {
              appViews {
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
          `,
        },
      ],
    });
  }

  deleteAppView(uuid: string): Observable<any> {
    const DELETE_APP_VIEW = gql`
      mutation DeleteAppView($uuid: String!) {
        deleteAppView(uuid: $uuid)
      }
    `;

    return this.apollo.mutate<any>({
      mutation: DELETE_APP_VIEW,
      variables: { uuid },
      refetchQueries: [
        {
          query: gql`
            query GetAppViews {
              appViews {
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
          `,
        },
      ],
    });
  }

  assignAppViewToUsers(appViewId: string, users: string[]): Observable<any> {
    const ASSIGN_APP_VIEW = gql`
      mutation AssignAppViewToUsers($appViewId: String!, $users: [String!]!) {
        assignAppViewToUsers(appViewId: $appViewId, users: $users)
      }
    `;

    return this.apollo.mutate<any>({
      mutation: ASSIGN_APP_VIEW,
      variables: { appViewId, users },
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
