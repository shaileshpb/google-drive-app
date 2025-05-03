import React from 'react';
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface GoogleAuthProps {
  onSuccess: (credential: string) => void;
  onError?: () => void;
}

const GOOGLE_CLIENT_ID = '616822746244-3t6vhvltmm88ibao1sgdkq69pl1gh5uq.apps.googleusercontent.com';

export const GoogleAuth: React.FC<GoogleAuthProps> = ({ onSuccess, onError }) => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <GoogleLogin
        onSuccess={(credentialResponse: CredentialResponse) => {
          if (credentialResponse.credential) {
            onSuccess(credentialResponse.credential);
          }
        }}
        onError={onError}
        useOneTap
      />
    </GoogleOAuthProvider>
  );
};
