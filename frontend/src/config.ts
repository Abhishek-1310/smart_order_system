// ============================================================
// App Configuration
// ============================================================

export const config = {
  // API Gateway endpoint (set after CDK deploy)
  apiUrl: import.meta.env.VITE_API_URL || 'https://pkvr8pe356.execute-api.ap-south-1.amazonaws.com/prod/',

  // Cognito configuration (set after CDK deploy)
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-south-1_ifiJyz3LD',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '4rqmkmfr13h93jij9vt587549g',
    region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
  },
};
