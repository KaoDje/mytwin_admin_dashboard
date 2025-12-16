# 🔐 Guide de Migration Frontend - Mises à jour Sécurité MyTwin API

Ce guide détaille les changements apportés à l'API MyTwin pour améliorer la sécurité et explique comment adapter votre application frontend.

## 📋 Table des Matières

1. [Breaking Changes](#-breaking-changes)
2. [Nouveau Flow d'Authentification](#-nouveau-flow-dauthentification)
3. [Exemples de Code](#-exemples-de-code)
4. [Migration Détaillée](#-migration-détaillée)
5. [Gestion des Erreurs](#-gestion-des-erreurs)
6. [Testing](#-testing)

---

## 🚨 Breaking Changes

### 1. Réponse Login Modifiée

**Avant:**
```graphql
{
  userId: "...",
  jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  userPreferences: {...},
  isNewAccount: false
}
```

**Après:**
```graphql
{
  userId: "...",
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  # 15 minutes
  refreshToken: "a1b2c3d4e5f6...",                            # 7 jours
  userPreferences: {...},
  isNewAccount: false
}
```

**Actions requises:**
- ✅ Remplacer toutes les références `response.jwt` par `response.accessToken`
- ✅ Stocker le `refreshToken` de manière sécurisée
- ✅ Implémenter un système de rafraîchissement automatique des tokens

### 2. Durée de Validité des Tokens

**Avant:**
- JWT unique : **12 heures**

**Après:**
- Access Token : **15 minutes**
- Refresh Token : **7 jours**

**Impact:**
- Les utilisateurs devront se re-authentifier toutes les 7 jours (au lieu de 12h)
- L'application doit rafraîchir l'access token automatiquement toutes les 15 minutes

### 3. Authentification Requise sur Tous les Endpoints

**Avant:**
- ❌ Uploads publics (aucune authentification)
- ❌ Accès fichiers public

**Après:**
- ✅ `POST /upload/file` - Requiert `Authorization: Bearer <token>`
- ✅ `POST /upload/file/image` - Requiert `Authorization: Bearer <token>`
- ✅ `POST /upload/file/pdf` - Requiert `Authorization: Bearer <token>`
- ✅ `POST /upload/audio` - Requiert `Authorization: Bearer <token>`
- ✅ `POST /upload/audio/voice-message` - Requiert `Authorization: Bearer <token>`
- ✅ `GET /files/:key` - Requiert `Authorization: Bearer <token>` + vérification propriété
- ✅ `GET /files/:key/url` - Requiert `Authorization: Bearer <token>` + vérification propriété

**Actions requises:**
- ✅ Ajouter header `Authorization: Bearer <accessToken>` à toutes les requêtes upload/file

### 4. Contrôle d'Accès Fichiers

**Avant:**
- N'importe qui peut accéder à n'importe quel fichier avec la clé

**Après:**
- ✅ Seul le propriétaire peut accéder à ses fichiers
- ✅ Les fichiers sans propriétaire (legacy) sont **refusés**
- ✅ Système de fichiers publics disponible (via configuration manuelle)

**Impact:**
- Les liens de fichiers doivent inclure un token d'authentification
- Les fichiers ne peuvent plus être partagés via simple URL (sauf si marqués public)

### 5. Rate Limiting

**Nouveau comportement:**

| Endpoint | Limite | Fenêtre | Erreur |
|----------|--------|---------|--------|
| Login GraphQL | 10 requêtes | 1 minute | `429 Too Many Requests` |
| Refresh Token | 20 requêtes | 1 minute | `429 Too Many Requests` |
| Uploads | 20 requêtes | 1 minute | `429 Too Many Requests` |
| Global (autres) | 100 requêtes | 1 minute | `429 Too Many Requests` |

**Actions requises:**
- ✅ Implémenter gestion d'erreur 429
- ✅ Afficher message convivial à l'utilisateur
- ✅ Ajouter retry logic avec backoff exponentiel

### 6. Validation Mot de Passe Renforcée

**Nouvelles règles (création de compte uniquement):**
- ✅ Minimum **12 caractères** (avant: 8)
- ✅ Au moins 1 majuscule
- ✅ Au moins 1 minuscule
- ✅ Au moins 1 chiffre
- ✅ Au moins 1 caractère spécial (@$!%*?&)

**Impact:**
- Les utilisateurs existants ne sont PAS affectés
- Seulement lors de la création de nouveaux comptes

---

## 🔄 Nouveau Flow d'Authentification

### Architecture Recommandée

```typescript
// Service de gestion des tokens
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;

  // Stocker les tokens après login
  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    // Stocker refresh token de manière sécurisée
    this.secureStorage.set('refreshToken', refreshToken);

    // Planifier rafraîchissement automatique (13 minutes = avant expiration)
    this.scheduleRefresh(13 * 60 * 1000);
  }

  // Récupérer l'access token actuel
  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Rafraîchir automatiquement l'access token
  private async scheduleRefresh(delay: number) {
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);

    this.refreshTimeout = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        // Si le refresh échoue, déconnecter l'utilisateur
        this.logout();
      }
    }, delay);
  }

  // Appeler l'API pour rafraîchir
  private async refreshAccessToken() {
    const result = await graphqlClient.mutate({
      mutation: REFRESH_TOKEN_MUTATION,
      variables: { refreshToken: this.refreshToken }
    });

    // Mettre à jour les tokens (rotation!)
    this.setTokens(
      result.data.refreshToken.accessToken,
      result.data.refreshToken.refreshToken
    );
  }

  // Déconnexion
  async logout() {
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout);

    // Révoquer le refresh token côté serveur
    if (this.refreshToken) {
      await graphqlClient.mutate({
        mutation: LOGOUT_MUTATION,
        variables: { refreshToken: this.refreshToken }
      });
    }

    this.accessToken = null;
    this.refreshToken = null;
    this.secureStorage.remove('refreshToken');
  }
}
```

### Diagramme de Flux

```
┌─────────────┐
│   Login     │
│  (username, │
│  password)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  API: mutation login        │
│  Retourne:                  │
│  - accessToken (15min)      │
│  - refreshToken (7j)        │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Stocker tokens:            │
│  - accessToken en mémoire   │
│  - refreshToken sécurisé    │
│  - Planifier refresh 13min  │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Utilisation normale        │
│  (requêtes avec accessToken)│
└──────┬──────────────────────┘
       │
       ▼
   13 minutes
       │
       ▼
┌─────────────────────────────┐
│  Auto-refresh:              │
│  mutation refreshToken      │
│  Retourne nouveaux tokens   │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Mise à jour tokens         │
│  Replanifier refresh        │
└──────┬──────────────────────┘
       │
       ▼
    Boucle...

Si refresh échoue (401):
       │
       ▼
┌─────────────────────────────┐
│  Déconnexion forcée         │
│  Redirection → Login        │
└─────────────────────────────┘
```

---

## 💻 Exemples de Code

### 1. Login GraphQL

**Mutation GraphQL:**
```graphql
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
```

**Implémentation TypeScript (React + Apollo Client):**
```typescript
import { gql, useMutation } from '@apollo/client';

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

function LoginComponent() {
  const [login, { loading, error }] = useMutation(LOGIN_MUTATION);
  const tokenManager = useTokenManager(); // Custom hook

  const handleLogin = async (username: string, password: string) => {
    try {
      const { data } = await login({
        variables: { username, password }
      });

      // Stocker les tokens
      tokenManager.setTokens(
        data.login.accessToken,
        data.login.refreshToken
      );

      // Rediriger vers l'application
      navigate('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      // Afficher erreur à l'utilisateur
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleLogin(username, password);
    }}>
      {/* Form fields */}
    </form>
  );
}
```

### 2. Refresh Token GraphQL

**Mutation GraphQL:**
```graphql
mutation RefreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
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
```

**Implémentation TypeScript:**
```typescript
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

async function refreshAccessToken(currentRefreshToken: string) {
  const { data } = await apolloClient.mutate({
    mutation: REFRESH_TOKEN_MUTATION,
    variables: { refreshToken: currentRefreshToken }
  });

  return {
    accessToken: data.refreshToken.accessToken,
    refreshToken: data.refreshToken.refreshToken, // NOUVEAU token !
  };
}
```

### 3. Logout GraphQL

**Mutation GraphQL:**
```graphql
mutation Logout($refreshToken: String!) {
  logout(refreshToken: $refreshToken)
}
```

**Implémentation TypeScript:**
```typescript
const LOGOUT_MUTATION = gql`
  mutation Logout($refreshToken: String!) {
    logout(refreshToken: $refreshToken)
  }
`;

async function logout(refreshToken: string) {
  try {
    await apolloClient.mutate({
      mutation: LOGOUT_MUTATION,
      variables: { refreshToken }
    });
  } catch (error) {
    // Continuer même si le logout échoue (token déjà révoqué, etc.)
    console.warn('Logout failed:', error);
  } finally {
    // Nettoyer localement de toute façon
    tokenManager.clearTokens();
    navigate('/login');
  }
}
```

### 4. Upload de Fichier REST

**Avant (sans authentification):**
```typescript
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://api.mytwin.com/upload/file', {
    method: 'POST',
    body: formData,
  });

  return response.json();
}
```

**Après (avec authentification):**
```typescript
async function uploadFile(file: File, accessToken: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('https://api.mytwin.com/upload/file', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`, // ✅ REQUIS
    },
    body: formData,
  });

  if (response.status === 401) {
    // Token expiré → rafraîchir et réessayer
    await tokenManager.refreshAccessToken();
    return uploadFile(file, tokenManager.getAccessToken()!);
  }

  if (response.status === 429) {
    // Rate limit → attendre et réessayer
    throw new Error('Too many requests - please wait and try again');
  }

  return response.json();
}
```

### 5. Accès aux Fichiers

**Affichage direct (à éviter si possible):**
```typescript
// ❌ Ne fonctionnera PAS (401 Unauthorized)
<img src="https://api.mytwin.com/files/abc123.jpg" />

// ✅ Utiliser un composant qui ajoute le token
<AuthenticatedImage fileKey="abc123.jpg" />
```

**Composant AuthenticatedImage (React):**
```typescript
function AuthenticatedImage({ fileKey }: { fileKey: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const tokenManager = useTokenManager();

  useEffect(() => {
    async function loadImage() {
      const accessToken = tokenManager.getAccessToken();

      const response = await fetch(
        `https://api.mytwin.com/files/${fileKey}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        setImageUrl(URL.createObjectURL(blob));
      }
    }

    loadImage();
  }, [fileKey]);

  if (!imageUrl) return <Spinner />;

  return <img src={imageUrl} alt="" />;
}
```

**Ou utiliser l'endpoint `/files/:key/url` pour obtenir une URL signée:**
```typescript
async function getSignedFileUrl(fileKey: string, accessToken: string) {
  const response = await fetch(
    `https://api.mytwin.com/files/${fileKey}/url`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  const data = await response.json();

  return {
    url: data.url,           // URL signée valide 1h
    expiresAt: data.expiresAt
  };
}

// Utilisation:
const { url } = await getSignedFileUrl('abc123.jpg', accessToken);
<img src={url} alt="" />
```

### 6. Intercepteur HTTP (Auto-Refresh)

**Axios Interceptor:**
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.mytwin.com'
});

// Ajouter access token à toutes les requêtes
apiClient.interceptors.request.use((config) => {
  const accessToken = tokenManager.getAccessToken();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Gérer refresh automatique sur 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si 401 et pas déjà en train de retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Rafraîchir l'access token
        await tokenManager.refreshAccessToken();

        // Réessayer la requête avec le nouveau token
        originalRequest.headers.Authorization =
          `Bearer ${tokenManager.getAccessToken()}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh a échoué → forcer déconnexion
        tokenManager.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

**Apollo Client Link (GraphQL):**
```typescript
import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';

// Link pour ajouter le token
const authLink = setContext((_, { headers }) => {
  const accessToken = tokenManager.getAccessToken();
  return {
    headers: {
      ...headers,
      authorization: accessToken ? `Bearer ${accessToken}` : '',
    }
  };
});

// Link pour gérer les erreurs et refresh
const errorLink = onError(({ graphQLErrors, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      // Si erreur d'authentification
      if (err.extensions?.code === 'UNAUTHENTICATED') {
        // Rafraîchir le token
        return fromPromise(
          tokenManager.refreshAccessToken().catch(() => {
            tokenManager.logout();
            window.location.href = '/login';
          })
        ).flatMap(() => {
          // Réessayer avec le nouveau token
          const oldHeaders = operation.getContext().headers;
          operation.setContext({
            headers: {
              ...oldHeaders,
              authorization: `Bearer ${tokenManager.getAccessToken()}`,
            },
          });
          return forward(operation);
        });
      }
    }
  }
});

const httpLink = createHttpLink({
  uri: 'https://api.mytwin.com/graphql'
});

const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache()
});
```

---

## 📝 Migration Détaillée

### Checklist de Migration

- [ ] **1. Mise à jour Login**
  - [ ] Remplacer `response.jwt` par `response.accessToken`
  - [ ] Stocker `response.refreshToken` de manière sécurisée
  - [ ] Implémenter système de stockage tokens (mémoire + secure storage)

- [ ] **2. Implémentation Refresh Token**
  - [ ] Créer mutation `refreshToken`
  - [ ] Implémenter service/hook `useTokenManager`
  - [ ] Ajouter planification auto-refresh (13 minutes)
  - [ ] Gérer rotation des refresh tokens

- [ ] **3. Intercepteurs HTTP**
  - [ ] Créer intercepteur pour ajouter `Authorization` header
  - [ ] Implémenter gestion erreur 401 avec auto-refresh
  - [ ] Implémenter gestion erreur 429 (rate limit)

- [ ] **4. Mise à jour Uploads**
  - [ ] Ajouter `Authorization` header à tous les uploads
  - [ ] Tester uploads avec nouveau système auth
  - [ ] Gérer erreurs 401/403/429

- [ ] **5. Mise à jour Accès Fichiers**
  - [ ] Créer composants `<AuthenticatedImage>`
  - [ ] Implémenter fetch avec Authorization header
  - [ ] Ou utiliser endpoint `/files/:key/url` pour URLs signées

- [ ] **6. Logout**
  - [ ] Créer mutation `logout`
  - [ ] Appeler logout lors de la déconnexion
  - [ ] Nettoyer tokens locaux (mémoire + storage)
  - [ ] Annuler timers de refresh

- [ ] **7. Gestion Erreurs**
  - [ ] Afficher messages utilisateur pour 401/403/429
  - [ ] Implémenter retry logic avec backoff
  - [ ] Tester scénarios: token expiré, refresh échoué, rate limit

- [ ] **8. Tests**
  - [ ] Login flow complet
  - [ ] Auto-refresh après 13 minutes
  - [ ] Logout
  - [ ] Upload avec auth
  - [ ] Accès fichiers avec auth
  - [ ] Gestion erreurs

### Exemple de Refactoring Complet

**Avant:**
```typescript
// auth.service.ts (old)
class AuthService {
  async login(username: string, password: string) {
    const { data } = await api.mutate({
      mutation: LOGIN,
      variables: { username, password }
    });

    localStorage.setItem('jwt', data.login.jwt);
    this.currentUser = data.login;
  }

  getToken() {
    return localStorage.getItem('jwt');
  }

  logout() {
    localStorage.removeItem('jwt');
    this.currentUser = null;
  }
}
```

**Après:**
```typescript
// token-manager.service.ts (new)
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;

  async login(username: string, password: string) {
    const { data } = await apolloClient.mutate({
      mutation: LOGIN_MUTATION,
      variables: { username, password }
    });

    this.setTokens(
      data.login.accessToken,
      data.login.refreshToken
    );

    return data.login;
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    // Stocker refresh token de manière sécurisée
    this.secureStorage.set('refreshToken', refreshToken);

    // Planifier refresh automatique
    this.scheduleRefresh(13 * 60 * 1000); // 13 minutes
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private scheduleRefresh(delay: number) {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        console.error('Auto-refresh failed:', error);
        this.logout();
      }
    }, delay);
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const { data } = await apolloClient.mutate({
      mutation: REFRESH_TOKEN_MUTATION,
      variables: { refreshToken: this.refreshToken }
    });

    this.setTokens(
      data.refreshToken.accessToken,
      data.refreshToken.refreshToken // ROTATION !
    );
  }

  async logout() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    if (this.refreshToken) {
      try {
        await apolloClient.mutate({
          mutation: LOGOUT_MUTATION,
          variables: { refreshToken: this.refreshToken }
        });
      } catch (error) {
        console.warn('Logout mutation failed:', error);
      }
    }

    this.accessToken = null;
    this.refreshToken = null;
    this.secureStorage.remove('refreshToken');
  }

  // Restaurer session au démarrage de l'app
  async restoreSession() {
    const storedRefreshToken = this.secureStorage.get('refreshToken');

    if (storedRefreshToken) {
      try {
        this.refreshToken = storedRefreshToken;
        await this.refreshAccessToken();
        return true;
      } catch (error) {
        console.error('Session restore failed:', error);
        this.secureStorage.remove('refreshToken');
        return false;
      }
    }

    return false;
  }
}
```

---

## ⚠️ Gestion des Erreurs

### Codes d'Erreur HTTP

| Code | Signification | Action Frontend |
|------|---------------|-----------------|
| `401` | Token invalide/expiré | Rafraîchir token automatiquement OU rediriger login |
| `403` | Accès refusé (ex: fichier d'un autre user) | Afficher "Accès refusé" |
| `429` | Rate limit dépassé | Attendre et réessayer avec backoff |

### Exemples de Gestion

**401 - Token Expiré:**
```typescript
if (error.response?.status === 401) {
  // Tenter refresh automatique
  try {
    await tokenManager.refreshAccessToken();
    // Réessayer la requête
    return retryRequest();
  } catch (refreshError) {
    // Refresh a échoué → forcer re-login
    tokenManager.logout();
    navigate('/login', {
      state: { message: 'Session expirée - veuillez vous reconnecter' }
    });
  }
}
```

**403 - Accès Refusé:**
```typescript
if (error.response?.status === 403) {
  showToast({
    type: 'error',
    message: 'Vous n\'avez pas accès à cette ressource'
  });
}
```

**429 - Rate Limit:**
```typescript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after'] || 60;

  showToast({
    type: 'warning',
    message: `Trop de requêtes - veuillez patienter ${retryAfter}s`
  });

  // Réessayer après le délai
  await sleep(retryAfter * 1000);
  return retryRequest();
}
```

### Retry Logic avec Backoff Exponentiel

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
) {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error as Error;

      // Ne pas retry sur certaines erreurs
      if (error.response?.status === 403) {
        throw error;
      }

      // Calculer délai backoff: 2^i * 1000ms
      const delay = Math.pow(2, i) * 1000;

      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError!;
}
```

---

## 🧪 Testing

### Tests E2E

```typescript
describe('Authentication Flow', () => {
  it('should login and receive tokens', async () => {
    const result = await login('testuser', 'Password123!');

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('userId');
  });

  it('should auto-refresh access token', async () => {
    const { accessToken: initialToken } = await login('testuser', 'Password123!');

    // Attendre 14 minutes (après auto-refresh planifié à 13min)
    await sleep(14 * 60 * 1000);

    const currentToken = tokenManager.getAccessToken();
    expect(currentToken).not.toBe(initialToken); // Token a changé
  });

  it('should logout and revoke refresh token', async () => {
    await login('testuser', 'Password123!');
    const refreshToken = tokenManager.getRefreshToken();

    await logout();

    // Tenter refresh avec l'ancien token → doit échouer
    await expect(
      refreshAccessToken(refreshToken)
    ).rejects.toThrow('Invalid refresh token');
  });
});

describe('File Upload', () => {
  it('should upload file with authentication', async () => {
    await login('testuser', 'Password123!');

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const result = await uploadFile(file);

    expect(result).toHaveProperty('key');
    expect(result).toHaveProperty('url');
  });

  it('should fail upload without authentication', async () => {
    tokenManager.clearTokens();

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

    await expect(uploadFile(file)).rejects.toThrow('401');
  });
});

describe('File Access', () => {
  it('should access own files', async () => {
    await login('testuser', 'Password123!');
    const file = await uploadFile(testFile);

    const fileData = await fetchFile(file.key);
    expect(fileData).toBeTruthy();
  });

  it('should deny access to other users files', async () => {
    await login('user1', 'Password123!');
    const file = await uploadFile(testFile);

    await login('user2', 'Password123!');

    await expect(fetchFile(file.key)).rejects.toThrow('403');
  });
});

describe('Rate Limiting', () => {
  it('should rate limit login attempts', async () => {
    // 11e tentative (limite: 10/min)
    for (let i = 0; i < 11; i++) {
      try {
        await login('testuser', 'wrong-password');
      } catch (error) {
        if (i === 10) {
          expect(error.status).toBe(429);
        }
      }
    }
  });
});
```

---

## 📚 Ressources Complémentaires

### Environment Variables Requises

```bash
# Backend (.env)
JWT_SECRET=your-secret-key-here
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=7
# JWT_CUTOFF_DATE=2025-12-10T18:00:00Z  # Pour invalider tous tokens avant cette date
```

### Endpoints API

**GraphQL:**
- `POST /graphql` - Endpoint GraphQL principal

**REST:**
- `POST /upload/file` - Upload fichier générique
- `POST /upload/file/image` - Upload image
- `POST /upload/file/pdf` - Upload PDF
- `POST /upload/audio` - Upload audio
- `POST /upload/audio/voice-message` - Upload message vocal
- `GET /files/:key` - Accès fichier (streaming ou redirect)
- `GET /files/:key/url` - Obtenir URL signée

### Support

Pour toute question ou problème lors de la migration:
1. Consulter les logs backend pour identifier les erreurs
2. Vérifier que tous les headers `Authorization` sont bien envoyés
3. Vérifier que le refresh token est bien stocké et accessible
4. Tester le flow complet en environnement de développement avant production

---

## ✅ Checklist Finale

Avant de déployer votre frontend en production:

- [ ] Tous les appels login utilisent `accessToken` et `refreshToken`
- [ ] Service TokenManager implémenté et testé
- [ ] Auto-refresh planifié et fonctionnel
- [ ] Intercepteurs HTTP configurés (401, 429)
- [ ] Tous les uploads incluent header `Authorization`
- [ ] Accès fichiers gère l'authentification
- [ ] Logout révoque le refresh token
- [ ] Messages d'erreur utilisateur conviviaux
- [ ] Tests E2E passent tous
- [ ] Documentation interne mise à jour

**Bonne migration! 🚀**
