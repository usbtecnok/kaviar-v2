// Tipos de usuário
export type UserType = 'DRIVER' | 'PASSENGER';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  user_type: UserType;
}
