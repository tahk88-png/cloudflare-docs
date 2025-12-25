import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { AgentRole, MessageRole, AiActionOutcome } from '@prisma/client';
import { supportAgentConfig, shouldRouteToSupport } from './agents/support';
import { opsAgentConfig, shouldRouteToOps } from './agents/ops';
import { salesAgentConfig, shouldRouteToSales } from './agents/sales';
import { toolDefinitions, executeTool, ToolResult } from './tools';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Agent configurations
const agentConfigs = {
  [AgentRole.SUPPORT]: supportAgentConfig,
  [AgentRole.OPS]: opsAgentConfig,
  [AgentRole.SALES]: salesAgentConfig,
};

// Route message to appropriate agent
export function routeToAgent(message: string, currentAgent?: AgentRole): AgentRole {
  // Priority-based routing
  if (shouldRouteToOps(message)) {
    return AgentRole.OPS;
  }
  if (shouldRouteToSales(message)) {
    return AgentRole.SALES;
  }
  if (shouldRouteToSupport(message)) {
    return AgentRole.SUPPORT;
  }

  // Default to current agent or support
  return currentAgent || AgentRole.SUPPORT;
}

// Build context for the AI
interface ConversationContext {
  conversationId: string;
  userId: string;
  bookingId?: string;
  userName?: string;
  contextData?: Record<string, unknown>;
}

function buildSystemPrompt(agentRole: AgentRole, context: ConversationContext): string {
  const agentConfig = agentConfigs[agentRole];
  let systemPrompt = agentConfig.systemPrompt;

  // Add context information
  systemPrompt += `\n\n--- CONTEXT ---`;
  systemPrompt += `\nConversation ID: ${context.conversationId}`;
  systemPrompt += `\nCustomer ID: ${context.userId}`;
  if (context.userName) {
    systemPrompt += `\nCustomer Name: ${context.userName}`;
  }
  if (context.bookingId) {
    systemPrompt += `\nRelated Booking ID: ${context.bookingId}`;
  }
  if (context.contextData) {
    systemPrompt += `\nAdditional Context: ${JSON.stringify(context.contextData)}`;
  }

  return systemPrompt;
}

// Get conversation history
async function getConversationHistory(conversationId: string, limit = 20) {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      role: true,
      content: true,
      agentRole: true,
    },
  });

  return messages.map(m => ({
    role: m.role === MessageRole.USER ? 'user' as const : 
          m.role === MessageRole.ASSISTANT ? 'assistant' as const : 'system' as const,
    content: m.content,
  }));
}

// Tool call type guard
interface FunctionToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

function isFunctionToolCall(tc: unknown): tc is FunctionToolCall {
  return (
    typeof tc === 'object' &&
    tc !== null &&
    'type' in tc &&
    (tc as { type: string }).type === 'function' &&
    'function' in tc
  );
}

// Process tool calls
async function processToolCalls(
  toolCalls: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[],
  context: ConversationContext,
  agentRole: AgentRole
): Promise<{ toolResults: { toolCallId: string; result: ToolResult }[]; anySuccess: boolean }> {
  const toolResults: { toolCallId: string; result: ToolResult }[] = [];
  let anySuccess = false;

  for (const toolCall of toolCalls) {
    if (!isFunctionToolCall(toolCall)) continue;
    
    const args = JSON.parse(toolCall.function.arguments);
    
    console.log(`[${agentRole}] Executing tool: ${toolCall.function.name}`, args);
    
    const result = await executeTool(
      toolCall.function.name,
      args,
      {
        userId: context.userId,
        conversationId: context.conversationId,
        agentRole,
      }
    );

    toolResults.push({ toolCallId: toolCall.id, result });
    if (result.success) anySuccess = true;
  }

  return { toolResults, anySuccess };
}

// Main orchestrator function
interface OrchestratorResponse {
  response: string;
  agentRole: AgentRole;
  toolCalls?: { name: string; args: Record<string, unknown>; result: ToolResult }[];
}

export async function processMessage(
  conversationId: string,
  userMessage: string
): Promise<OrchestratorResponse> {
  // Get conversation and context
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Route to appropriate agent
  const agentRole = routeToAgent(userMessage, conversation.currentAgent);

  // Update conversation if agent changed
  if (agentRole !== conversation.currentAgent) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { currentAgent: agentRole },
    });
  }

  // Store user message
  await prisma.message.create({
    data: {
      conversationId,
      userId: conversation.userId,
      role: MessageRole.USER,
      content: userMessage,
    },
  });

  // Build context
  const context: ConversationContext = {
    conversationId,
    userId: conversation.userId,
    bookingId: conversation.bookingId || undefined,
    userName: conversation.user.name,
    contextData: conversation.contextData as Record<string, unknown> | undefined,
  };

  // Get conversation history
  const history = await getConversationHistory(conversationId);

  // Build messages for OpenAI
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(agentRole, context) },
    ...history,
  ];

  // Call OpenAI
  let completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools: toolDefinitions,
    tool_choice: 'auto',
    temperature: 0.7,
    max_tokens: 1000,
  });

  let assistantMessage = completion.choices[0].message;
  const allToolCalls: { name: string; args: Record<string, unknown>; result: ToolResult }[] = [];

  // Handle tool calls
  while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const { toolResults } = await processToolCalls(
      assistantMessage.tool_calls,
      context,
      agentRole
    );

    // Record tool calls
    let resultIndex = 0;
    for (const tc of assistantMessage.tool_calls) {
      if (isFunctionToolCall(tc)) {
        allToolCalls.push({
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments),
          result: toolResults[resultIndex].result,
        });
        resultIndex++;
      }
    }

    // Add tool results to messages
    messages.push({
      role: 'assistant',
      content: assistantMessage.content,
      tool_calls: assistantMessage.tool_calls,
    });

    for (const { toolCallId, result } of toolResults) {
      messages.push({
        role: 'tool',
        tool_call_id: toolCallId,
        content: JSON.stringify(result),
      });
    }

    // Get follow-up response
    completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: toolDefinitions,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000,
    });

    assistantMessage = completion.choices[0].message;
  }

  const responseContent = assistantMessage.content || 'I apologize, but I was unable to generate a response. Please try again.';

  // Store assistant message
  await prisma.message.create({
    data: {
      conversationId,
      role: MessageRole.ASSISTANT,
      content: responseContent,
      agentRole,
      toolCalls: allToolCalls.length > 0 ? JSON.stringify(allToolCalls) : undefined,
    },
  });

  // Log the interaction
  await prisma.aiAction.create({
    data: {
      action: 'chat_response',
      reason: `Responded to user message as ${agentRole}`,
      outcome: AiActionOutcome.SUCCESS,
      input: { userMessage: userMessage.substring(0, 200) },
      output: { 
        responseLength: responseContent.length,
        toolCallsCount: allToolCalls.length,
      },
      triggeredBy: `chat:${conversationId}`,
      agentRole,
      completedAt: new Date(),
    },
  });

  return {
    response: responseContent,
    agentRole,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
  };
}

// Create a new conversation
export async function createConversation(
  userId: string,
  bookingId?: string,
  contextData?: Record<string, unknown>
): Promise<string> {
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      bookingId,
      contextData: contextData as any,
      currentAgent: AgentRole.SUPPORT,
    },
  });

  return conversation.id;
}

// Get or create conversation for user
export async function getOrCreateConversation(
  userId: string,
  bookingId?: string,
  contextData?: Record<string, unknown>
): Promise<string> {
  // Look for an existing open conversation
  const existing = await prisma.conversation.findFirst({
    where: {
      userId,
      status: { in: ['OPEN', 'WAITING_USER', 'WAITING_AGENT'] },
      ...(bookingId ? { bookingId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) {
    // Update context if provided
    if (contextData) {
      await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          contextData: {
            ...(existing.contextData as Record<string, unknown> || {}),
            ...contextData,
          } as any,
        },
      });
    }
    return existing.id;
  }

  return createConversation(userId, bookingId, contextData);
}
