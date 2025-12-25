import { Role } from "@prisma/client";

export interface AgentResponse {
  response: string;
  role: Role;
  actionTaken?: string;
  metadata?: any;
}

export interface AgentContext {
  bookingId: string;
  userMessage: string;
  userId: string;
}
