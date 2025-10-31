
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateChatResponse } from '../services/geminiService';
import { ChatMessage, GroundingChunk } from '../types';
import { UserIcon, SparklesIcon } from './Icons';

// Custom components to style markdown output
const markdownComponents = {
    h1: ({...props}) => <h1 className="text-2xl font-bold my-2" {...props} />,
    h2: ({...props}) => <h2 className="text-xl font-bold my-2" {...props} />,
    h3: ({...props}) => <h3 className="text-lg font-bold my-2" {...props} />,
    p: ({...props}) => <p className="my-1" {...props} />,
    ul: ({...props}) => <ul className="list-disc list-inside my-2 space-y-1" {...props} />,
    ol: ({...props}) => <ol className="list-decimal list-inside my-2 space-y-1" {...props} />,
    li: ({...props}) => <li className="my-1" {...props} />,
    code: ({ inline, className, children, ...props }: any) => {
        return !inline ? (
        <pre className="bg-fission-dark-secondary p-3 rounded-md my-2 overflow-x-auto">
            <code className="font-mono text-sm text-fission-text" {...props}>{children}</code>
        </pre>
        ) : (
        <code className="bg-fission-dark-secondary px-1.5 py-1 rounded-md font-mono text-sm" {...props}>
            {children}
        </code>
        );
    },
    a: ({...props}) => <a className="text-fission-cyan hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    blockquote: ({...props}) => <blockquote className="border-l-4 border-fission-purple pl-4 italic my-2 text-gray-300" {...props} />
};


export const Chat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useSearchGrounding, setUseSearchGrounding] = useState(false);
    const [useMaps, setUseMaps] = useState(false);
    const [useThinking, setUseThinking] = useState(false);
    const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | undefined>(undefined);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (useMaps && !userLocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    console.warn("Could not get user location:", error.message);
                }
            );
        }
    }, [useMaps, userLocation]);


    const handleSend = async () => {
        if (!input.trim()) return;
        
        const userMessage: ChatMessage = { 
            sender: 'user', 
            text: input, 
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        };
        const newMessages: ChatMessage[] = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setLoading(true);
        setError(null);
        
        try {
            const history = newMessages.filter(m => m.sender === 'model' || m.sender === 'user');
            const response = await generateChatResponse(history.slice(0, -1), input, useSearchGrounding, useMaps, useThinking, userLocation);
            setMessages([...newMessages, { 
                sender: 'model', 
                text: response.text, 
                groundingChunks: response.groundingChunks,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } catch (e) {
            setError('Failed to get response. Please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    
    const renderGrounding = (chunks: GroundingChunk[]) => (
        <div className="mt-2 text-sm">
            <h4 className="font-semibold text-gray-300">Sources:</h4>
            <ul className="list-disc list-inside space-y-2">
                {chunks.map((chunk, index) => {
                    if (chunk.web) {
                        return (
                            <li key={index}>
                                <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-fission-cyan hover:underline">
                                    {chunk.web.title}
                                </a>
                            </li>
                        );
                    }
                    if (chunk.maps) {
                        return (
                            <li key={index}>
                                <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-fission-cyan hover:underline">
                                    {chunk.maps.title}
                                </a>
                                {chunk.maps.placeAnswerSources?.map((source, s_idx) =>
                                    source.reviewSnippets?.map((snippet, sn_idx) => (
                                        <div key={`${s_idx}-${sn_idx}`} className="pl-4 mt-1 border-l-2 border-gray-600 text-gray-400">
                                            <blockquote className="italic">"{snippet.text}"</blockquote>
                                            {snippet.uri && (
                                                <a href={snippet.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-fission-cyan hover:underline ml-1">
                                                    Read full review
                                                </a>
                                            )}
                                        </div>
                                    ))
                                )}
                            </li>
                        );
                    }
                    return null;
                })}
            </ul>
        </div>
    );
    
    const promptSuggestions = [
        "Write a short sci-fi story about a sentient neon sign.",
        "What are the best-rated Italian restaurants near me?",
        "Explain quantum computing in simple terms.",
        "Write a python function to reverse a string.",
    ];
    
    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
    };

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-fission-text">Chat with Gemini</h2>
            <div className="flex-1 overflow-y-auto p-4 bg-fission-dark-secondary rounded-t-lg">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 my-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'model' &&
                            <div className="flex-shrink-0 p-2 rounded-full bg-fission-purple">
                                <SparklesIcon />
                            </div>
                        }
                        <div className={`max-w-xl rounded-lg p-3 ${msg.sender === 'user' ? 'bg-fission-purple' : 'bg-fission-dark'}`}>
                            {msg.sender === 'model' ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {msg.text}
                                </ReactMarkdown>
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            )}
                            {msg.groundingChunks && renderGrounding(msg.groundingChunks)}
                            <div className={`text-right text-xs mt-1 ${msg.sender === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>{msg.timestamp}</div>
                        </div>
                        {msg.sender === 'user' &&
                            <div className="flex-shrink-0 p-2 rounded-full bg-fission-cyan">
                                <UserIcon/>
                            </div>
                        }
                    </div>
                ))}
                {loading && (
                    <div className="flex items-start gap-3 my-4">
                        <div className="p-2 rounded-full bg-fission-purple">
                             <SparklesIcon />
                        </div>
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
                <div className="mb-3">
                    <p className="text-sm text-gray-400 mb-2">Try a suggestion:</p>
                    <div className="flex flex-wrap gap-2">
                        {promptSuggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="bg-fission-dark hover:bg-fission-purple text-fission-text text-sm py-1 px-3 rounded-full transition-colors"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
                 <div className="flex items-center space-x-4 mb-3 pt-3 border-t border-fission-dark">
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={useSearchGrounding} onChange={() => setUseSearchGrounding(!useSearchGrounding)} className="form-checkbox h-5 w-5 text-fission-cyan bg-fission-dark border-fission-purple rounded focus:ring-fission-cyan"/>
                        <span className="ml-2 text-sm">Search Grounding</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={useMaps} onChange={() => setUseMaps(!useMaps)} className="form-checkbox h-5 w-5 text-fission-cyan bg-fission-dark border-fission-purple rounded focus:ring-fission-cyan"/>
                        <span className="ml-2 text-sm">Google Maps</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={useThinking} onChange={() => setUseThinking(!useThinking)} className="form-checkbox h-5 w-5 text-fission-cyan bg-fission-dark border-fission-purple rounded focus:ring-fission-cyan"/>
                        <span className="ml-2 text-sm">Thinking Mode (Complex)</span>
                    </label>
                </div>
                <div className="flex">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask anything..."
                        className="flex-1 p-3 bg-fission-dark text-fission-text rounded-l-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
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
