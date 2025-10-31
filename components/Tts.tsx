
import React, { useState, useRef } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/helpers';

export const Tts: React.FC = () => {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);

    const handleSpeak = async () => {
        if (!text.trim()) {
            setError('Please enter some text.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const base64Audio = await generateSpeech(text);
            
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            const outputNode = audioContextRef.current.createGain();
            outputNode.connect(audioContextRef.current.destination);

            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.start();

        } catch (e) {
            setError('Failed to generate speech. Please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6">Text-to-Speech</h2>
            <div className="bg-fission-dark-secondary p-6 rounded-lg shadow-lg">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type anything you want to hear..."
                    className="w-full p-3 bg-fission-dark text-fission-text rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none transition"
                    rows={5}
                />
                <button
                    onClick={handleSpeak}
                    disabled={loading}
                    className="w-full mt-4 bg-fission-cyan hover:bg-fission-pink text-fission-dark font-bold py-3 px-6 rounded-md transition-colors disabled:bg-fission-purple disabled:cursor-not-allowed"
                >
                    {loading ? 'Generating...' : 'Speak'}
                </button>
            </div>
            {error && <div className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}
        </div>
    );
};