export type JoinWaitlistInput = {
  email: string;
  honeypot: string;
};

export type JoinWaitlistResult = { ok: true } | { ok: false; message: string };
