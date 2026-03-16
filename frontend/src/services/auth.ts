// ============================================================
// Amazon Cognito Authentication Service
// ============================================================

import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { config } from '../config';
import { AuthUser, SignUpData, SignInData, ConfirmSignUpData } from '../types';

// Initialize Cognito User Pool
const userPool = new CognitoUserPool({
  UserPoolId: config.cognito.userPoolId,
  ClientId: config.cognito.clientId,
});

/**
 * Sign up a new user with Cognito.
 */
export function signUp(data: SignUpData): Promise<string> {
  return new Promise((resolve, reject) => {
    const attributeList: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: 'email', Value: data.email }),
    ];

    if (data.name) {
      attributeList.push(
        new CognitoUserAttribute({ Name: 'name', Value: data.name })
      );
    }

    userPool.signUp(
      data.username,
      data.password,
      attributeList,
      [],
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result?.user.getUsername() || data.username);
      }
    );
  });
}

/**
 * Confirm sign up with verification code.
 */
export function confirmSignUp(data: ConfirmSignUpData): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: data.username,
      Pool: userPool,
    });

    cognitoUser.confirmRegistration(data.code, true, (err, _result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Sign in user and get JWT tokens.
 */
export function signIn(data: SignInData): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: data.username,
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: data.username,
      Password: data.password,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const idToken = session.getIdToken();
        const payload = idToken.decodePayload();

        const user: AuthUser = {
          username: payload['cognito:username'] || data.username,
          email: payload.email || '',
          sub: payload.sub || '',
          token: idToken.getJwtToken(),
        };

        resolve(user);
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

/**
 * Sign out current user.
 */
export function signOut(): void {
  const currentUser = userPool.getCurrentUser();
  if (currentUser) {
    currentUser.signOut();
  }
}

/**
 * Get current authenticated user session.
 */
export function getCurrentUser(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const currentUser = userPool.getCurrentUser();

    if (!currentUser) {
      resolve(null);
      return;
    }

    currentUser.getSession(
      (err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null);
          return;
        }

        const idToken = session.getIdToken();
        const payload = idToken.decodePayload();

        resolve({
          username: payload['cognito:username'] || '',
          email: payload.email || '',
          sub: payload.sub || '',
          token: idToken.getJwtToken(),
        });
      }
    );
  });
}

/**
 * Resend confirmation code.
 */
export function resendConfirmationCode(username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: username,
      Pool: userPool,
    });

    cognitoUser.resendConfirmationCode((err, _result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}
