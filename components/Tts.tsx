import React, { useState, useRef } from 'react';
import { generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/helpers';
import { Spinner } from './Spinner';

const voices = ['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir'];

export const Tts: React.FC = () => {
    const [text, setText] = useState("Hello! I'm a friendly AI from Google. You can change my voice and speaking speed below.");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [voiceName, setVoiceName] = useState('Kore');
    const [speakingRate, setSpeakingRate] = useState(1);

    const audioContextRef = useRef<AudioContext | null>(null);

    const handleSpeak = async () => {
        if (!text.trim()) {
            setError('Please enter some text.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const base64Audio = await generateSpeech(text, voiceName, speakingRate);
            
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
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
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="voice" className="block text-sm font-medium text-fission-text mb-2">Voice</label>
                        <select
                            id="voice"
                            value={voiceName}
                            onChange={(e) => setVoiceName(e.target.value)}
                            className="w-full bg-fission-dark text-fission-text p-2 rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none"
                        >
                            {voices.map(voice => (
                                <option key={voice} value={voice}>{voice}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="rate" className="block text-sm font-medium text-fission-text mb-2">Speaking Rate ({speakingRate.toFixed(2)}x)</label>
                        <input
                            id="rate"
                            type="range"
                            min="0.5"
                            max="2.0"
                            step="0.01"
                            value={speakingRate}
                            onChange={(e) => setSpeakingRate(Number(e.target.value))}
                            className="w-full h-2 bg-fission-purple rounded-lg appearance-none cursor-pointer accent-fission-cyan"
                        />
                    </div>
                </div>
                <button
                    onClick={handleSpeak}
                    disabled={loading}
                    className="w-full mt-6 bg-fission-cyan hover:bg-fission-pink text-fission-dark font-bold py-3 px-6 rounded-md transition-colors disabled:bg-fission-purple disabled:cursor-not-allowed"
                >
                    {loading ? 'Generating...' : 'Speak'}
                </button>
            </div>
            {loading && <Spinner message="Generating audio..." />}
            {error && <div className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}
        </div>
    );
};