/**
 * AI Assistant Context
 * Provides context-aware prompts and suggestions based on current route/page
 */

export interface AssistantSuggestion {
  label: string
  prompt: string
  icon?: string
}

export interface AssistantContext {
  systemPrompt: string
  suggestions: AssistantSuggestion[]
  placeholder: string
}

/**
 * Get assistant context based on current route
 */
export function getAssistantContext(route: string): AssistantContext {
  // Handle both full paths and route keys
  const routeKey = route.startsWith('/') 
    ? route.split('/').filter(Boolean)[0] || 'dashboard'
    : route || 'dashboard'
  
  switch (routeKey) {
    case 'dashboard':
      return {
        systemPrompt: 'You are an AI assistant helping with the Secure Web dashboard. You can help users understand their activity, suggest next actions, and provide insights about their workspace.',
        suggestions: [
          {
            label: 'Summarize today',
            prompt: 'Summarize my activity and tasks for today'
          },
          {
            label: 'What can I do next?',
            prompt: 'What are the most important things I should focus on next?'
          }
        ],
        placeholder: 'Ask about your dashboard, tasks, or activity...'
      }
    
    case 'rooms':
      return {
        systemPrompt: 'You are an AI assistant helping with room management and meetings. You can help create agendas, summarize meeting notes, and manage room activities.',
        suggestions: [
          {
            label: 'Create agenda',
            prompt: 'Help me create an agenda for my next meeting'
          },
          {
            label: 'Summarize meeting notes (demo)',
            prompt: 'Summarize the key points from recent meeting notes'
          }
        ],
        placeholder: 'Ask about rooms, meetings, or collaboration...'
      }
    
    case 'calendar':
      return {
        systemPrompt: 'You are an AI assistant helping with calendar and scheduling. You can suggest optimal meeting times, check for conflicts, and help manage events.',
        suggestions: [
          {
            label: 'Suggest best time',
            prompt: 'Suggest the best time for a meeting based on my current schedule'
          },
          {
            label: 'Check conflicts',
            prompt: 'Check my calendar for any scheduling conflicts'
          }
        ],
        placeholder: 'Ask about scheduling, events, or time management...'
      }
    
    case 'files':
      return {
        systemPrompt: 'You are an AI assistant helping with file management. You can help organize files, search documents by topic, and manage file storage.',
        suggestions: [
          {
            label: 'Organize files',
            prompt: 'Help me organize my files and suggest a better folder structure'
          },
          {
            label: 'Search document by topic',
            prompt: 'Help me find documents related to a specific topic'
          }
        ],
        placeholder: 'Ask about files, documents, or organization...'
      }
    
    case 'trash':
      return {
        systemPrompt: 'You are an AI assistant helping with trash and file recovery. You can predict recovery probability and recommend which files to restore.',
        suggestions: [
          {
            label: 'Recovery prediction',
            prompt: 'Analyze my deleted files and predict which ones are most likely to be recovered'
          },
          {
            label: 'Restore recommendations',
            prompt: 'Recommend which deleted files I should restore based on importance and recovery probability'
          }
        ],
        placeholder: 'Ask about deleted files or recovery options...'
      }
    
    case 'security':
      return {
        systemPrompt: 'You are an AI assistant helping with security monitoring. You can explain security alerts, recommend actions, and provide security insights.',
        suggestions: [
          {
            label: 'Explain alert',
            prompt: 'Explain the most recent security alert in simple terms'
          },
          {
            label: 'Recommend next step',
            prompt: 'What should I do about the recent security alerts?'
          }
        ],
        placeholder: 'Ask about security alerts, threats, or recommendations...'
      }
    
    case 'administration':
    case 'admin':
      return {
        systemPrompt: 'You are an AI assistant helping with system administration. You can provide system summaries, usage insights, and administrative recommendations.',
        suggestions: [
          {
            label: 'System summary',
            prompt: 'Provide a summary of the current system status and key metrics'
          },
          {
            label: 'Usage insights',
            prompt: 'Analyze user activity and provide insights about system usage patterns'
          }
        ],
        placeholder: 'Ask about system administration, users, or analytics...'
      }
    
    case 'chat':
      return {
        systemPrompt: 'You are an AI assistant helping with chat and messaging. You can help compose messages, suggest replies, and manage conversations.',
        suggestions: [
          {
            label: 'Compose message',
            prompt: 'Help me compose a professional message'
          },
          {
            label: 'Suggest reply',
            prompt: 'Suggest a reply to the current conversation'
          }
        ],
        placeholder: 'Ask about messaging or chat features...'
      }
    
    case 'recent':
      return {
        systemPrompt: 'You are an AI assistant helping with recent activity. You can summarize recent actions and help users find what they were working on.',
        suggestions: [
          {
            label: 'Summarize activity',
            prompt: 'Summarize my recent activity and actions'
          },
          {
            label: 'Find recent work',
            prompt: 'Help me find what I was working on recently'
          }
        ],
        placeholder: 'Ask about recent activity or actions...'
      }
    
    default:
      return {
        systemPrompt: 'You are an AI assistant for Secure Web. You can help with various tasks across the platform.',
        suggestions: [
          {
            label: 'How can you help?',
            prompt: 'What can you help me with?'
          },
          {
            label: 'Platform overview',
            prompt: 'Give me an overview of the Secure Web platform features'
          }
        ],
        placeholder: 'Ask me anything...'
      }
  }
}

/**
 * Get route from pathname
 */
export function getRouteFromPath(pathname: string): string {
  // Remove leading slash and get first segment
  const segments = pathname.split('/').filter(Boolean)
  return segments[0] || 'dashboard'
}

