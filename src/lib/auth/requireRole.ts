import { redirect } from 'next/navigation';

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

// Mock function to get current user. In real app, use NextAuth or similar.
export async function getCurrentUser() {
  // For development, return a super admin user
  return {
    id: 'dev-user',
    email: 'dev@rentbox.ee',
    role: Role.OWNER,
  };
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login'); // Assuming a login page exists or will exist
  }

  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }

  return user;
}
