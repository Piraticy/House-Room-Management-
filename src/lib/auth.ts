import { compare } from "bcryptjs";
import { Role } from "@prisma/client";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        const isValidPassword = await compare(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }

      return session;
    },
  },
};

export function roleHomePath(role: Role) {
  if (role === Role.ADMIN) {
    return "/admin";
  }

  if (role === Role.OWNER) {
    return "/owner";
  }

  return "/tenant";
}

export async function getAuthSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(role: Role | Role[]) {
  const session = await requireUser();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (!allowedRoles.includes(session.user.role)) {
    redirect(roleHomePath(session.user.role));
  }

  return session;
}
