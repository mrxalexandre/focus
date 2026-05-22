export type TDAHRole = 'admin' | 'psicologa' | 'psicopedagoga' | 'fonoaudiologa' | 'professora' | 'pais';

export interface Child {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string; // for login
  password?: string;
  name: string;
  role: TDAHRole;
  childId?: string; // Linked child
  canViewDashboard?: boolean;
}

export interface EngineResponse {
  data?: any;
  report?: string;
  error?: string;
}

