export interface UserDto {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  name: string | null;
}

export interface IUserRepository {
  findById(id: string): Promise<{
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: Date;
    profile: { name: string | null } | null;
  } | null>;
}
