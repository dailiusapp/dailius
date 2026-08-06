export type ProfileFieldErrors = {
  fullName?: string;
};

export type UpdateProfileInput = {
  fullName: string;
};

export type UpdateProfileResult =
  | { ok: true; fullName: string }
  | { ok: false; message: string; field?: keyof ProfileFieldErrors };
