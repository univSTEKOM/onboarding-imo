export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
  permissions: string[];
  emailVerified: boolean;
  // OIDC session id — present only for sessions minted via SSO login. Used to
  // revoke the session on back-channel logout (see RevokedSsoSession).
  sid?: string;
}
