export interface CreateIdentityInput {
  firstName: string;
  lastName: string;
  birthDate?: string;
  birthCity?: string;
  city?: string;
  country?: string;
  biologicalSex?: 'male' | 'female';
}

export interface UpdateIdentityInput {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthCity?: string;
  city?: string;
  country?: string;
  biologicalSex?: 'male' | 'female';
}
