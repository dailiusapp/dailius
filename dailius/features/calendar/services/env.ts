function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getGoogleClientId(): string {
  return requireEnv("GOOGLE_CLIENT_ID", process.env.GOOGLE_CLIENT_ID);
}

export function getGoogleClientSecret(): string {
  return requireEnv("GOOGLE_CLIENT_SECRET", process.env.GOOGLE_CLIENT_SECRET);
}
