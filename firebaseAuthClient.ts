import { Auth, getAuth } from 'firebase/auth';
import { app } from './firebaseClient';

export const auth: Auth | null = app ? getAuth(app) : null;
