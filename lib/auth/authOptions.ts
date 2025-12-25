import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const credentialsSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
});

export const authOptions: NextAuthOptions = {
	session: { strategy: "jwt" },
	pages: {
		signIn: "/admin/login",
	},
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				const parsed = credentialsSchema.safeParse(credentials);
				if (!parsed.success) return null;

				const email = parsed.data.email.toLowerCase();
				const user = await prisma.user.findUnique({ where: { email } });
				if (!user?.active) return null;
				if (!user.passwordHash) return null;

				const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
				if (!ok) return null;

				return {
					id: user.id,
					email: user.email,
					name: user.name ?? undefined,
					role: user.role,
					active: user.active,
				} as any;
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.sub = (user as any).id;
				(token as any).role = (user as any).role;
				(token as any).active = (user as any).active;
			}
			return token;
		},
		async session({ session, token }) {
			if (session.user) {
				(session.user as any).id = token.sub;
				(session.user as any).role = (token as any).role;
				(session.user as any).active = (token as any).active;
			}
			return session;
		},
	},
	events: {
		async signIn({ user }) {
			// Server log for auditability (auth events).
			console.info(`[admin-auth] signIn userId=${(user as any)?.id ?? "?"}`);
		},
	},
};

