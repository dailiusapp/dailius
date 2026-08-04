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

export type SignInFieldErrors = {
  email?: string;
  password?: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; message: string; field?: keyof SignInFieldErrors };
