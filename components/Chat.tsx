import React, { useState, useEffect, useRef } from 'react';
import { generateChatResponse } from '../services/geminiService';
import { ChatMessage, GroundingChunk } from '../types';
import { UserIcon, SparklesIcon } from './Icons';

export const Chat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useSearch, setUseSearch] = useState(false);
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
            const response = await generateChatResponse(history.slice(0, -1), input, useSearch, useMaps, useThinking, userLocation);
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
                                <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-gemini-blue hover:underline">
                                    {chunk.web.title}
                                </a>
                            </li>
                        );
                    }
                    if (chunk.maps) {
                        return (
                            <li key={index}>
                                <a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-gemini-blue hover:underline">
                                    {chunk.maps.title}
                                </a>
                                {chunk.maps.placeAnswerSources?.map((source, s_idx) =>
                                    source.reviewSnippets?.map((snippet, sn_idx) => (
                                        <div key={`${s_idx}-${sn_idx}`} className="pl-4 mt-1 border-l-2 border-gray-600 text-gray-400">
                                            <blockquote className="italic">"{snippet.text}"</blockquote>
                                            {snippet.uri && (
                                                <a href={snippet.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-gemini-blue hover:underline ml-1">
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

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-gemini-text">Chat with Gemini</h2>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-800 rounded-t-lg">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 my-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'model' &&
                            <div className="flex-shrink-0 p-2 rounded-full bg-gray-600">
                                <SparklesIcon />
                            </div>
                        }
                        <div className={`max-w-xl rounded-lg p-3 ${msg.sender === 'user' ? 'bg-gemini-blue' : 'bg-gray-700'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.groundingChunks && renderGrounding(msg.groundingChunks)}
                            <div className={`text-right text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>{msg.timestamp}</div>
                        </div>
                        {msg.sender === 'user' &&
                            <div className="flex-shrink-0 p-2 rounded-full bg-gemini-blue">
                                <UserIcon/>
                            </div>
                        }
                    </div>
                ))}
                {loading && (
                    <div className="flex items-start gap-3 my-4">
                        <div className="p-2 rounded-full bg-gray-600">
                             <SparklesIcon />
                        </div>
                        <div className="max-w-xl p-3 rounded-lg bg-gray-700">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-gemini-blue rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-gemini-blue rounded-full animate-pulse delay-75"></div>
                                <div className="w-2 h-2 bg-gemini-blue rounded-full animate-pulse delay-150"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            {error && <div className="p-2 text-center text-red-400 bg-red-900/50">{error}</div>}
            <div className="p-4 bg-gray-800 rounded-b-lg border-t border-gray-700">
                <div className="flex items-center space-x-4 mb-3">
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={useSearch} onChange={() => setUseSearch(!useSearch)} className="form-checkbox h-5 w-5 text-gemini-blue bg-gray-700 border-gray-500 rounded focus:ring-gemini-blue"/>
                        <span className="ml-2 text-sm">Google Search</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={useMaps} onChange={() => setUseMaps(!useMaps)} className="form-checkbox h-5 w-5 text-gemini-blue bg-gray-700 border-gray-500 rounded focus:ring-gemini-blue"/>
                        <span className="ml-2 text-sm">Google Maps</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                        <input type="checkbox" checked={useThinking} onChange={() => setUseThinking(!useThinking)} className="form-checkbox h-5 w-5 text-gemini-blue bg-gray-700 border-gray-500 rounded focus:ring-gemini-blue"/>
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
                        className="flex-1 p-3 bg-gray-700 text-gemini-text rounded-l-md border border-gray-600 focus:ring-2 focus:ring-gemini-blue focus:outline-none"
                        disabled={loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input}
                        className="bg-gemini-blue hover:bg-gemini-dark-blue text-white font-bold py-2 px-4 rounded-r-md disabled:bg-gray-600"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};