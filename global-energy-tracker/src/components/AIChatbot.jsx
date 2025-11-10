import { useState, useEffect, useRef } from 'react';
import { sendMessage, getSuggestedQuestions, loadProjectContext } from '../services/aiChatService';

export default function AIChatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI energy analyst. I can answer questions about:\n\nCurrent energy transition status\nHistorical trends (1965-2024)\nFuture projections (3 scenarios to 2050)\nMethodology and efficiency factors\nDisplacement calculations\n\nWhat would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);

  // Load suggested questions on mount
  useEffect(() => {
    loadProjectContext().then(data => {
      if (data) {
        setSuggestedQuestions(getSuggestedQuestions(data));
      }
    });
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e, predefinedQuestion = null) => {
    e?.preventDefault();
    const question = predefinedQuestion || input;
    if (!question.trim()) return;

    // Hide suggestions after first question
    setShowSuggestions(false);

    // Add user message
    const userMessage = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build conversation history (exclude current message)
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Send to Claude API
      const response = await sendMessage(question, conversationHistory);

      // Add assistant response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content,
        metadata: response.tokensUsed ? {
          model: response.modelUsed,
          tokens: response.tokensUsed
        } : null,
        error: response.error
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your API key configuration and try again.',
        error: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question) => {
    handleSubmit(null, question);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. What would you like to know about the energy transition?'
      }
    ]);
    setShowSuggestions(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Analyze with AI
          </h3>
        </div>
        <button
          onClick={clearChat}
          className="text-sm text-blue-100 hover:text-white transition-colors px-3 py-1 rounded border border-blue-400 hover:border-white"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[500px] max-h-[700px] bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.error
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-200'
              }`}
            >
              {/* Message content with enhanced formatting */}
              <div className="prose prose-sm max-w-none whitespace-pre-wrap" style={{
                lineHeight: '1.6'
              }}>
                {message.content.split('\n').map((line, i) => {
                  // Detect subheadings (standalone lines followed by body text)
                  const isSubheading = line.trim() &&
                    !line.includes('.') &&
                    !line.includes(',') &&
                    line.length < 60 &&
                    line.trim() === line.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                  if (isSubheading && message.role === 'assistant') {
                    return <div key={i} className="font-bold text-gray-900 mt-3 mb-1">{line}</div>;
                  }
                  return <div key={i}>{line || <br />}</div>;
                })}
              </div>

              {/* Metadata for assistant messages */}
              {message.role === 'assistant' && message.metadata && (
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                  {message.metadata.model} • {message.metadata.tokens.input + message.metadata.tokens.output} tokens
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg px-4 py-3 shadow-sm border border-gray-200">
              <div className="flex gap-1.5 items-center">
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <span className="text-sm text-gray-500 ml-2">Analyzing data...</span>
              </div>
            </div>
          </div>
        )}

        {/* Suggested questions */}
        {showSuggestions && suggestedQuestions.length > 0 && messages.length === 1 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-500">Suggested questions:</p>
            <div className="grid grid-cols-1 gap-2">
              {suggestedQuestions.slice(0, 5).map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="text-left text-sm px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors text-gray-600"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about energy data, trends, projections..."
            className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Send'
            )}
          </button>
        </form>
        <div className="text-xs text-gray-500">
          <span>1965-2024 historical data • 2025-2050 projections</span>
        </div>
      </div>
    </div>
  );
}
