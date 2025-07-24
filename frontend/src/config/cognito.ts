export const cognitoAuthConfig = {
  authority:
    process.env.NEXT_PUBLIC_COGNITO_AUTHORITY ||
    "https://cognito-idp.eu-west-3.amazonaws.com/eu-west-3_9tyN1YsF6",
  client_id:
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "2rccpq0s894f6a66d1hmimship",
  redirect_uri:
    process.env.NEXT_PUBLIC_REDIRECT_URI ||
    "https://app.rockilus.com/fr/plan/workers",
  post_logout_redirect_uri:
    process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI || "https://www.rockilus.com",
  response_type: "code",
  scope: "email openid phone",
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
  monitorSession: false,
  checkSessionInterval: 10000,
};

export const cognitoDomain =
  process.env.NEXT_PUBLIC_COGNITO_DOMAIN ||
  "https://eu-west-39tyn1ysf6.auth.eu-west-3.amazoncognito.com";

export const logoutUri =
  process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URI || "https://www.rockilus.com";
