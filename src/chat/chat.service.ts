import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import * as cheerio from 'cheerio';
import axios from 'axios';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private embeddingService: EmbeddingService,
  ) {}

  async chat(apiKey: string, message: string, sessionId?: string) {
    // Find project by API key
    const project = await this.prisma.project.findUnique({
      where: { apiKey },
    });

    if (!project) {
      throw new Error('Invalid API key');
    }

    // Get relevant documents using RAG
    const relevantDocuments = await this.getRelevantDocuments(project.id, message);

    // Generate response based on retrieved documents using LLM
    const answer = await this.generateResponse(message, relevantDocuments, project.language);

    // Save chat log
    await this.prisma.chatLog.create({
      data: {
        projectId: project.id,
        question: message,
        answer,
        createdAt: new Date(),
      },
    });

    return { answer, sources: relevantDocuments };
  }

  private async getRelevantDocuments(projectId: string, query: string): Promise<string[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbeddings(query);

      // Search in Qdrant for relevant documents with project filtering
      const searchResults = await this.qdrantService.search(queryEmbedding, projectId);

      // Extract content directly from Qdrant payload to avoid redundant HTML parsing
      const documentContents: string[] = [];
      for (const result of searchResults) {
        // Use the content field from the Qdrant payload which was already cleaned
        if (result.payload && result.payload.content) {
          documentContents.push(result.payload.content as string);
        }
      }

      return documentContents;
    } catch (error) {
      console.error('Error retrieving relevant documents:', error);
      return [];
    }
  }

  private async generateResponse(question: string, context: string[], language: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Determine response language based on the project language or question language
    const responseLanguage = this.detectLanguage(question) === 'am' || language === 'am' ? 'Amharic' : 'English';

    // Prepare context for the LLM
    const contextText = context.length > 0
      ? context.join('\n---\n')
      : "No relevant information found in the documents.";

    // Create the system prompt to enforce language adherence
    const systemPrompt = `You are a helpful assistant. Identify the language of the user's input. If it is Amharic (even if written in Latin script), respond in Amharic. If in English, answer in English. Always respond in ${responseLanguage}. If the answer is not found in the provided context, say 'I do not have that information' and do not make up an answer. Only use information from the provided context.`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o', // Using a robust multilingual model
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Context: ${contextText}\n\nQuestion: ${question}\n\nPlease answer the question based on the context provided.` }
          ],
          max_tokens: 500,
          temperature: 0.3,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating response with LLM:', error);
      // Fallback response if LLM call fails
      if (context.length > 0) {
        return `Based on the provided information: ${context[0].substring(0, 500)}...`;
      } else {
        return "I couldn't find any relevant information to answer your question.";
      }
    }
  }

  private detectLanguage(text: string): 'am' | 'en' {
    // Check for actual Amharic script characters (Ge'ez script)
    const amharicScriptRegex = /[\u1200-\u137F]/;
    if (amharicScriptRegex.test(text)) {
      return 'am';
    }

    // Enhanced detection for transliterated Amharic (Amharic written phonetically in Latin script)
    // This includes common Amharic words/phrases written in Latin characters
    const transliteratedAmharicPatterns = [
      /(?:\b|_)selam(?:\b|_)/i,      // Hello
      /(?:\b|_)tena(?:\b|_)/i,       // How
      /(?:\b|_)merhab(?:\b|_)/i,     // Hello (informal)
      /(?:\b|_)bahil(?:\b|_)/i,      // Goodbye
      /(?:\b|_)debeb(?:\b|_)/i,      // Don't know
      /(?:\b|_)nigus(?:\b|_)/i,      // King
      /(?:\b|_)ast(i|e)(?:\b|_)/i,   // Person
      /(?:\b|_)bet(?:\b|_)/i,        // House
      /(?:\b|_)(?:ye|e|a|i|u|o)(?:\b|_)/, // Common Amharic grammatical particles
    ];

    for (const pattern of transliteratedAmharicPatterns) {
      if (pattern.test(text)) {
        return 'am';
      }
    }

    // If no Amharic patterns detected, default to English
    return 'en';
  }

  async getProjectByApiKey(apiKey: string) {
    return await this.prisma.project.findUnique({
      where: { apiKey },
    });
  }

  async getEmbedScript(apiKey: string) {
    const project = await this.prisma.project.findUnique({
      where: { apiKey },
    });

    if (!project) {
      throw new Error('Invalid API key');
    }

    // Return the JavaScript code for the embeddable widget
    const embedScript = `
// Ethio-Bridge Chat Widget
(function() {
  // Create widget container
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'ethio-bridge-widget';
  widgetContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000;';
  document.body.appendChild(widgetContainer);

  // Create the iframe for the chat widget
  const iframe = document.createElement('iframe');
  iframe.id = 'ethio-bridge-iframe';
  iframe.src = 'about:blank';
  iframe.style.cssText = 'width: 400px; height: 500px; border: none; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
  iframe.style.display = 'none';

  // Create the launcher button
  const launcher = document.createElement('button');
  launcher.id = 'ethio-bridge-launcher';
  launcher.innerHTML = '💬';
  launcher.style.cssText = 'width: 60px; height: 60px; border-radius: 50%; background: #4f46e5; color: white; border: none; font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
  launcher.onclick = function() {
    if (iframe.style.display === 'none') {
      iframe.style.display = 'block';
      // Set the actual source when opened - using the chat interface endpoint
      iframe.src = '/chat-interface?apiKey=${apiKey}';
    } else {
      iframe.style.display = 'none';
    }
  };

  widgetContainer.appendChild(launcher);
  widgetContainer.appendChild(iframe);

  // Listen for messages from the iframe
  window.addEventListener('message', function(event) {
    if (event.data.type === 'resize') {
      iframe.style.height = event.data.height + 'px';
    }
  });
})();
    `.trim();

    return embedScript;
  }

  async getChatInterface(apiKey: string) {
    const project = await this.prisma.project.findUnique({
      where: { apiKey },
    });

    if (!project) {
      throw new Error('Invalid API key');
    }

    // Return a simple HTML chat interface
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name} Chat</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
        }
        #chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            max-width: 100%;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        #messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background-color: #fafafa;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px 15px;
            border-radius: 18px;
            max-width: 80%;
        }
        .user-message {
            background-color: #e3f2fd;
            margin-left: auto;
        }
        .bot-message {
            background-color: #f0f0f0;
            margin-right: auto;
        }
        #input-area {
            display: flex;
            padding: 15px;
            background: white;
            border-top: 1px solid #eee;
        }
        #message-input {
            flex: 1;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 24px;
            outline: none;
        }
        #send-button {
            margin-left: 10px;
            padding: 12px 20px;
            background: #4f46e5;
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
        }
        #send-button:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        .typing-indicator {
            color: #888;
            font-style: italic;
            padding: 10px 15px;
        }
    </style>
</head>
<body>
    <div id="chat-container">
        <div id="messages">
            <div class="message bot-message">Hello! I'm your assistant for ${project.name}. How can I help you today?</div>
        </div>
        <div id="input-area">
            <input type="text" id="message-input" placeholder="Type your message..." />
            <button id="send-button">Send</button>
        </div>
    </div>

    <script>
        const apiKey = '${apiKey}';
        const messagesContainer = document.getElementById('messages');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');

        function addMessage(text, isUser) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message');
            messageDiv.classList.add(isUser ? 'user-message' : 'bot-message');
            messageDiv.textContent = text;
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function showTypingIndicator() {
            const typingDiv = document.createElement('div');
            typingDiv.classList.add('typing-indicator');
            typingDiv.id = 'typing-indicator';
            typingDiv.textContent = 'Thinking...';
            messagesContainer.appendChild(typingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function hideTypingIndicator() {
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
        }

        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;

            // Add user message to UI
            addMessage(message, true);
            messageInput.value = '';
            sendButton.disabled = true;

            // Show typing indicator
            showTypingIndicator();

            try {
                const response = await fetch('/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': apiKey
                    },
                    body: JSON.stringify({ message })
                });

                const data = await response.json();

                // Hide typing indicator
                hideTypingIndicator();

                // Add bot response to UI
                addMessage(data.answer, false);
            } catch (error) {
                // Hide typing indicator
                hideTypingIndicator();

                // Show error message
                addMessage('Sorry, I encountered an error. Please try again.', false);
                console.error('Error sending message:', error);
            } finally {
                sendButton.disabled = false;
                messageInput.focus();
            }
        }

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Send initial focus to input
        messageInput.focus();
    </script>
</body>
</html>
    `;

    return html;
  }
}