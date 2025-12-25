import OpenAI from 'openai';
import { tools, ToolExecutor } from './tools';
import { getAgentPrompt, routeToAgent, AgentType } from './agents';
import { MessageRepository } from '../repositories/messages';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: any;
}

export interface ChatContext {
  conversation_id: string;
  booking_id?: number;
  user_id?: number;
  agent_type?: AgentType;
}

export class AIOrchestrator {
  private openai: OpenAI;
  private toolExecutor: ToolExecutor;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.toolExecutor = new ToolExecutor();
  }

  async chat(
    userMessage: string,
    context: ChatContext
  ): Promise<{ response: string; agent_type: AgentType; tool_calls?: any[] }> {
    // Load conversation history
    const history = await MessageRepository.findByConversation(context.conversation_id);

    // Determine which agent to use
    const agentType = context.agent_type || routeToAgent(userMessage, context);
    const systemPrompt = getAgentPrompt(agentType);

    // Save user message
    await MessageRepository.create({
      conversation_id: context.conversation_id,
      booking_id: context.booking_id,
      user_id: context.user_id,
      role: 'user',
      content: userMessage
    });

    // Build messages array for OpenAI
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    for (const msg of history) {
      if (msg.role === 'system') continue; // Skip system messages
      
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    });

    // Add context information if available
    if (context.booking_id) {
      messages.push({
        role: 'system',
        content: `Context: User is asking about booking ID ${context.booking_id}. Use get_booking tool to retrieve details if needed.`
      });
    }

    // Call OpenAI with function calling
    let response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 1000
    });

    let assistantMessage = response.choices[0].message;
    const executedTools: any[] = [];

    // Handle tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant's message with tool calls
      messages.push(assistantMessage as any);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`Agent ${agentType} calling tool: ${toolName}`, toolArgs);

        const toolResult = await this.toolExecutor.execute(
          toolName,
          toolArgs,
          agentType
        );

        executedTools.push({
          name: toolName,
          arguments: toolArgs,
          result: toolResult
        });

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        } as any);
      }

      // Get next response from OpenAI
      response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000
      });

      assistantMessage = response.choices[0].message;
    }

    const finalResponse = assistantMessage.content || 'I apologize, but I was unable to generate a response.';

    // Save assistant message
    await MessageRepository.create({
      conversation_id: context.conversation_id,
      booking_id: context.booking_id,
      user_id: context.user_id,
      role: 'assistant',
      content: finalResponse,
      agent_type: agentType,
      tool_calls: executedTools.length > 0 ? executedTools : undefined
    });

    return {
      response: finalResponse,
      agent_type: agentType,
      tool_calls: executedTools.length > 0 ? executedTools : undefined
    };
  }

  async handleEvent(
    eventType: string,
    payload: any
  ): Promise<void> {
    // This method can be used by the automation system to trigger AI actions
    console.log('AI handling event:', eventType, payload);

    // Example: automatically respond to failed locker operations
    if (eventType === 'locker.open_failed') {
      const booking_id = payload.booking_id;
      
      // Check how many failures
      const failures = await this.toolExecutor.execute(
        'get_booking',
        { booking_id },
        'ops'
      );

      // If multiple failures, create a ticket
      if (payload.attempt_count >= 2) {
        await this.toolExecutor.execute(
          'create_ticket',
          {
            booking_id,
            user_id: payload.user_id,
            title: 'Locker door malfunction - repeated failures',
            description: `Locker compartment ${payload.compartment_number} has failed to open ${payload.attempt_count} times. User cannot access their rental. Immediate physical intervention required.`,
            priority: 'urgent',
            category: 'locker_issue'
          },
          'ops'
        );
      }
    }
  }
}
