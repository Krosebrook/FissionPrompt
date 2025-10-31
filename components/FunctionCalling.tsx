import React, { useState, useEffect, useRef } from 'react';
import type { Content } from '@google/genai';
import { sendFunctionCallMessage } from '../services/geminiService';
import { UserIcon, SparklesIcon, CpuChipIcon } from './Icons';

interface ConversationMessage {
  role: 'user' | 'model' | 'tool';
  timestamp: string;
  text?: string;
  functionCall?: { name: string; args: any };
  functionResponse?: { name: string; response: any };
}

// Mock function for demonstration
const getWeather = (city: string) => {
    if (city.toLowerCase().includes("tokyo")) {
        return { temperature: 18, condition: "Cloudy with a chance of rain." };
    } else if (city.toLowerCase().includes("london")) {
        return { temperature: 12, condition: "Mostly sunny." };
    } else if (city.toLowerCase().includes("paris")) {
        return { temperature: 15, condition: "Clear skies." };
    } else {
        return { temperature: Math.floor(Math.random() * 30) + 5, condition: "A bit of everything." };
    }
};

export const FunctionCalling: React.FC = () => {
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    useEffect(scrollToBottom, [messages]);

    const handleSend = async (messageText: string) => {
        if (!messageText.trim()) return;

        const userMessage: ConversationMessage = {
            role: 'user',
            text: messageText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setInput('');
        setLoading(true);
        setError(null);
        
        await processModelResponse(currentMessages);
    };
    
    const processModelResponse = async (currentMessages: ConversationMessage[]) => {
        const history: Content[] = currentMessages.map(msg => {
            if (msg.role === 'tool') {
                return {
                    role: 'tool',
                    parts: [{ functionResponse: msg.functionResponse }]
                };
            }
            if (msg.role === 'model' && msg.functionCall) {
                return {
                    role: 'model',
                    parts: [{ functionCall: msg.functionCall }]
                };
            }
            return {
                role: msg.role as 'user' | 'model',
                parts: [{ text: msg.text || '' }]
            };
        });

        try {
            const response = await sendFunctionCallMessage(history);
            
            let newMessages = [...currentMessages];

            if (response.functionCalls && response.functionCalls.length > 0) {
                const fc = response.functionCalls[0];
                const modelFunctionCallMessage: ConversationMessage = {
                    role: 'model',
                    functionCall: { name: fc.name, args: fc.args },
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                newMessages.push(modelFunctionCallMessage);
                setMessages(newMessages);

                const functionResult = getWeather(fc.args.city);

                const toolResponseMessage: ConversationMessage = {
                    role: 'tool',
                    functionResponse: { name: fc.name, response: functionResult },
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                newMessages.push(toolResponseMessage);
                setMessages(newMessages);
                
                await processModelResponse(newMessages);

            } else if (response.text) {
                const modelTextMessage: ConversationMessage = {
                    role: 'model',
                    text: response.text,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages([...newMessages, modelTextMessage]);
            }
        } catch (e: any) {
            setError(`Failed to get response: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-fission-text">Function Calling</h2>
            <div className="bg-fission-dark-secondary p-4 rounded-lg mb-4 text-sm">
                <p>This demo showcases Gemini's ability to use external tools. The model has access to a function: <code className="bg-fission-dark px-1.5 py-1 rounded-md font-mono">getWeather(city: string)</code>.</p>
                <p className="mt-2">Try asking: <strong className="text-fission-cyan-dark">"What's the weather like in Tokyo?"</strong> or <strong className="text-fission-cyan-dark">"Is it sunny in Paris?"</strong></p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-fission-dark-secondary rounded-t-lg">
                {messages.map((msg, index) => {
                    if (msg.role === 'user') {
                        return (
                             <div key={index} className="flex items-start gap-3 my-4 justify-end">
                                <div className="max-w-xl rounded-lg p-3 bg-fission-purple">
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                    <div className="text-right text-xs mt-1 text-purple-200">{msg.timestamp}</div>
                                </div>
                                <div className="flex-shrink-0 p-2 rounded-full bg-fission-cyan"><UserIcon/></div>
                            </div>
                        );
                    }
                    if (msg.role === 'model') {
                        return (
                            <div key={index} className="flex items-start gap-3 my-4 justify-start">
                                <div className="flex-shrink-0 p-2 rounded-full bg-fission-purple"><SparklesIcon /></div>
                                <div className="max-w-xl rounded-lg p-3 bg-fission-dark">
                                    {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                                    {msg.functionCall && (
                                        <div>
                                            <p className="font-semibold text-fission-pink">Function Call:</p>
                                            <pre className="bg-fission-dark-secondary p-2 rounded-md my-1 text-sm overflow-x-auto">
                                                <code>{msg.functionCall.name}({JSON.stringify(msg.functionCall.args, null, 2)})</code>
                                            </pre>
                                        </div>
                                    )}
                                    <div className="text-right text-xs mt-1 text-gray-400">{msg.timestamp}</div>
                                </div>
                            </div>
                        );
                    }
                    if (msg.role === 'tool') {
                        return (
                            <div key={index} className="flex items-start gap-3 my-4 justify-start">
                                 <div className="flex-shrink-0 p-2 rounded-full bg-fission-dark"><CpuChipIcon /></div>
                                 <div className="max-w-xl rounded-lg p-3 bg-fission-purple/30 border border-fission-purple">
                                    <p className="font-semibold text-fission-cyan">Tool Result for <code className="font-mono">{msg.functionResponse?.name}</code>:</p>
                                    <pre className="bg-fission-dark-secondary p-2 rounded-md my-1 text-sm overflow-x-auto">
                                        <code>{JSON.stringify(msg.functionResponse?.response, null, 2)}</code>
                                    </pre>
                                     <div className="text-right text-xs mt-1 text-gray-400">{msg.timestamp}</div>
                                 </div>
                            </div>
                        );
                    }
                    return null;
                })}
                {loading && (
                    <div className="flex items-start gap-3 my-4">
                        <div className="p-2 rounded-full bg-fission-purple"><SparklesIcon /></div>
                        <div className="max-w-xl p-3 rounded-lg bg-fission-dark">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-fission-cyan rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-fission-cyan rounded-full animate-pulse delay-75"></div>
                                <div className="w-2 h-2 bg-fission-cyan rounded-full animate-pulse delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>

            {error && <div className="p-2 text-center text-red-400 bg-red-900/50">{error}</div>}
            
            <div className="p-4 bg-fission-dark-secondary rounded-b-lg border-t border-fission-dark">
                <div className="flex">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                        placeholder="Ask about the weather..."
                        className="flex-1 p-3 bg-fission-dark text-fission-text rounded-l-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none"
                        disabled={loading}
                    />
                    <button
                        onClick={() => handleSend(input)}
                        disabled={loading || !input}
                        className="bg-fission-cyan hover:bg-fission-pink text-fission-dark font-bold py-2 px-4 rounded-r-md disabled:bg-fission-purple"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};