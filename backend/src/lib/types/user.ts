export type PublicUser = {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};
