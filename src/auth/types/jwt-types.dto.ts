class JwtPayload {
  sub: string;
  email: string;
  role: string;
  sessionVersion?: number;
  hasValidSubscription?: boolean;
}

class JwtToken {
  access: string;
}

export { JwtPayload, JwtToken };
