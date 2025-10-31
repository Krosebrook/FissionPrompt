import React, { useState, useEffect, useRef } from 'react';
import { connectLive } from '../services/geminiService';
import { encode, decode, decodeAudioData } from '../utils/helpers';
import type { LiveServerMessage, LiveSession, Blob } from '@google/genai';

export const LiveConvo: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userTranscript, setUserTranscript] = useState('');
    const [modelTranscript, setModelTranscript] = useState('');
    const [conversationHistory, setConversationHistory] = useState<{user: string, model: string}[]>([]);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const nextStartTimeRef = useRef(0);
    const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const cleanup = () => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
        }
        setIsSessionActive(false);
        nextStartTimeRef.current = 0;
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
    };
    
    useEffect(() => {
        return cleanup;
    }, []);

    const startConversation = async () => {
        setError(null);
        setConversationHistory([]);
        setUserTranscript('');
        setModelTranscript('');

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Your browser does not support the necessary audio features. Please try a modern browser like Chrome or Firefox.");
            }

            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const outputNode = outputAudioContextRef.current.createGain();
            outputNode.connect(outputAudioContextRef.current.destination);

            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            const callbacks = {
                onopen: () => {
                    sourceRef.current = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
                    scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent: AudioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        if (sessionPromiseRef.current) {
                            sessionPromiseRef.current.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        }
                    };
                    sourceRef.current.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.outputTranscription) {
                        const text = message.serverContent.outputTranscription.text;
                        currentOutputTranscription += text;
                        setModelTranscript(currentOutputTranscription);
                    } else if (message.serverContent?.inputTranscription) {
                        const text = message.serverContent.inputTranscription.text;
                        currentInputTranscription += text;
                        setUserTranscript(currentInputTranscription);
                    }

                    if (message.serverContent?.turnComplete) {
                        setConversationHistory(prev => [...prev, {user: currentInputTranscription, model: currentOutputTranscription}]);
                        currentInputTranscription = '';
                        currentOutputTranscription = '';
                        setUserTranscript('');
                        setModelTranscript('');
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                        
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.addEventListener('ended', () => audioSourcesRef.current.delete(source));
                        source.start(nextStartTimeRef.current);
                        
                        nextStartTimeRef.current += audioBuffer.duration;
                        audioSourcesRef.current.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    setError(`Connection error. Please check your internet connection and try again.`);
                    cleanup();
                },
                onclose: (e: CloseEvent) => {
                    cleanup();
                },
            };

            sessionPromiseRef.current = connectLive(callbacks);
            setIsSessionActive(true);

        } catch (err: any) {
             if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setError('Microphone access denied. Please enable microphone permissions in your browser settings to continue.');
            } else if (err.name === 'NotFoundError') {
                setError('No microphone found. Please connect a microphone and try again.');
            } else {
                 setError(err.message || 'Failed to start conversation. Please ensure your microphone is connected and permissions are granted.');
            }
            cleanup();
        }
    };

    const stopConversation = () => {
        cleanup();
    };

    const createBlob = (data: Float32Array): Blob => {
        const int16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) {
            int16[i] = data[i] * 32768;
        }
        return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6">Live Conversation</h2>
            <div className="bg-fission-dark-secondary p-6 rounded-lg shadow-lg">
                <div className="flex justify-center mb-6">
                    {!isSessionActive ? (
                        <button onClick={startConversation} className="bg-fission-cyan hover:bg-fission-pink text-fission-dark font-bold py-3 px-8 rounded-full transition-colors text-lg">Start Talking</button>
                    ) : (
                        <button onClick={stopConversation} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-colors text-lg">Stop Conversation</button>
                    )}
                </div>
                {error && <div className="text-center text-red-400 bg-red-900/30 border border-red-500 p-3 rounded-md mb-4">{error}</div>}
                
                <div className="min-h-[300px] bg-fission-dark rounded-md p-4 space-y-4">
                    {conversationHistory.map((turn, index) => (
                        <div key={index}>
                           <p className="text-fission-cyan font-semibold">You:</p>
                           <p className="ml-4">{turn.user}</p>
                           <p className="text-fission-pink font-semibold mt-2">Model:</p>
                           <p className="ml-4">{turn.model}</p>
                        </div>
                    ))}
                     <div className="pt-4 border-t border-fission-purple">
                        <p className="text-fission-cyan font-semibold">You are saying:</p>
                        <p className="ml-4 italic text-gray-400">{userTranscript || "..."}</p>
                        <p className="text-fission-pink font-semibold mt-2">Model is saying:</p>
                        <p className="ml-4 italic text-gray-400">{modelTranscript || "..."}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};