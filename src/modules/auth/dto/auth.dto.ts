export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: 'Bearer';
}

export interface AuthUserDto {
  id: string;
  email: string;
  role: string;
  name: string | null;
}

export interface AuthResponseDto {
  user: AuthUserDto;
  tokens: AuthTokensDto;
}

export interface ForgotPasswordResponseDto {
  message: string;
  /** Present only in non-production for local testing */
  resetToken?: string;
}
