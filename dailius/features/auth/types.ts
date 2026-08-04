export type SignUpFieldErrors = {
  fullName?: string;
  email?: string;
  password?: string;
};

export type SignUpInput = {
  fullName: string;
  email: string;
  password: string;
};

export type SignUpResult =
  | { ok: true }
  | { ok: false; message: string; field?: keyof SignUpFieldErrors };
