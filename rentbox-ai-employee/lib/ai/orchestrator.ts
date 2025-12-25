import OpenAI from 'openai';
import { db } from '../db';
import { Booking, Message } from '../types';
import { getBooking } from './tools/get-booking';
import { createTicket } from './tools/create-ticket';
import { sendEmail } from '../email';
import { sendSMS } from '../sms';
import { logAIAction } from './tools/log-action';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AgentRole {
  name: 'support' | 'ops' | 'sales';
  systemPrompt: string;
}

const AGENTS: Record<string, AgentRole> = {
  support: {
    name: 'support',
    systemPrompt: `You are a customer support agent for Rentbox, a locker rental service.
Your role is to help customers with:
- Booking issues and questions
- Payment problems
- Locker access problems
- General inquiries

Be friendly, helpful, and solution-oriented. If you cannot resolve an issue, escalate to ops or create a ticket.`,
  },
  ops: {
    name: 'ops',
    systemPrompt: `You are an operations agent for Rentbox.
Your role is to handle:
- Technical locker issues
- Compartment access problems
- System errors
- Urgent operational matters

You have access to locker controls and can investigate technical issues. Be technical and precise.`,
  },
  sales: {
    name: 'sales',
    systemPrompt: `You are a sales agent for Rentbox.
Your role is to:
- Help with new bookings
- Answer product questions
- Handle pricing inquiries
- Convert inquiries to bookings

Be persuasive but not pushy. Focus on understanding customer needs and matching them with the right product.`,
  },
};

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_booking',
      description: 'Get booking details by ID',
      parameters: {
        type: 'object',
        properties: {
          booking_id: { type: 'number', description: 'The booking ID' },
        },
        required: ['booking_id'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_ticket',
      description: 'Create a support ticket',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Ticket title' },
          description: { type: 'string', description: 'Ticket description' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        },
        required: ['title', 'description'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_email',
      description: 'Send an email to the customer',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_sms',
      description: 'Send an SMS to the customer',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient phone number' },
          message: { type: 'string', description: 'SMS message' },
        },
        required: ['to', 'message'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'log_ai_action',
      description: 'Log an AI action for audit purposes',
      parameters: {
        type: 'object',
        properties: {
          action_type: { type: 'string', description: 'Type of action' },
          reason: { type: 'string', description: 'Reason for action' },
          outcome: { type: 'string', description: 'Outcome of action' },
        },
        required: ['action_type', 'reason'],
      },
    },
  },
];

export async function routeMessage(
  conversationId: string,
  userId: number | null,
  bookingId: number | null,
  userMessage: string
): Promise<string> {
  // Determine which agent to use based on message content
  const agentRole = await determineAgent(userMessage, bookingId);
  const agent = AGENTS[agentRole];

  // Get conversation history
  const history = await getConversationHistory(conversationId);

  // Build messages for OpenAI
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: agent.systemPrompt },
    ...history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  // Call OpenAI with tool calling
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    tools: TOOLS,
    tool_choice: 'auto',
  });

  const assistantMessage = response.choices[0]?.message;
  if (!assistantMessage) {
    throw new Error('No response from AI');
  }

  let finalResponse = assistantMessage.content || '';

  // Handle tool calls
  if (assistantMessage.tool_calls) {
    for (const toolCall of assistantMessage.tool_calls) {
      const result = await executeToolCall(
        toolCall.function.name,
        JSON.parse(toolCall.function.arguments),
        userId,
        bookingId
      );

      // Add tool result to conversation
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: [toolCall],
      });
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });

      // Get final response after tool execution
      const finalResponseCall = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
      });

      finalResponse = finalResponseCall.choices[0]?.message?.content || finalResponse;
    }
  }

  // Save messages to database
  await db.query(
    `INSERT INTO messages (conversation_id, booking_id, user_id, role, content)
     VALUES ($1, $2, $3, 'user', $4)`,
    [conversationId, bookingId, userId, userMessage]
  );

  await db.query(
    `INSERT INTO messages (conversation_id, booking_id, user_id, role, content, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [conversationId, bookingId, userId, agentRole, finalResponse, { agent: agentRole }]
  );

  return finalResponse;
}

async function determineAgent(message: string, bookingId: number | null): Promise<string> {
  // Simple keyword-based routing - can be enhanced with ML
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('book') || lowerMessage.includes('rent') || lowerMessage.includes('price')) {
    return 'sales';
  }

  if (lowerMessage.includes('locker') || lowerMessage.includes('open') || lowerMessage.includes('compartment')) {
    return 'ops';
  }

  return 'support';
}

async function getConversationHistory(conversationId: string): Promise<Message[]> {
  const result = await db.query(
    `SELECT role, content FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT 20`,
    [conversationId]
  );
  return result.rows;
}

async function executeToolCall(
  toolName: string,
  args: any,
  userId: number | null,
  bookingId: number | null
): Promise<any> {
  switch (toolName) {
    case 'get_booking':
      return await getBooking(args.booking_id);
    case 'create_ticket':
      return await createTicket({
        userId: userId!,
        bookingId,
        title: args.title,
        description: args.description,
        priority: args.priority || 'medium',
      });
    case 'send_email':
      await sendEmail({
        to: args.to,
        subject: args.subject,
        html: args.body,
      });
      return { success: true, message: 'Email sent' };
    case 'send_sms':
      await sendSMS({
        to: args.to,
        body: args.message,
      });
      return { success: true, message: 'SMS sent' };
    case 'log_ai_action':
      return await logAIAction({
        actionType: args.action_type,
        userId,
        bookingId,
        reason: args.reason,
        outcome: args.outcome,
      });
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
