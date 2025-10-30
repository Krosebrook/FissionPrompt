
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';

export const ImageGen: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt) {
            setError('Please enter a prompt.');
            return;
        }
        setLoading(true);
        setError(null);
        setGeneratedImage(null);
        try {
            const imageUrl = await generateImage(prompt, aspectRatio);
            setGeneratedImage(imageUrl);
        } catch (e) {
            setError('Failed to generate image. Please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-gemini-text">Image Generation</h2>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A robot holding a red skateboard."
                    className="w-full p-3 bg-gray-700 text-gemini-text rounded-md border border-gray-600 focus:ring-2 focus:ring-gemini-blue focus:outline-none transition"
                    rows={3}
                />
                <div className="flex items-center justify-between mt-4">
                     <div className="flex items-center">
                        <label htmlFor="aspectRatio" className="mr-2 text-gemini-text">Aspect Ratio:</label>
                        <select
                            id="aspectRatio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="bg-gray-700 text-gemini-text p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-gemini-blue focus:outline-none"
                        >
                            <option value="1:1">1:1</option>
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-gemini-blue hover:bg-gemini-dark-blue text-white font-bold py-2 px-6 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>

            {error && <div className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}

            {loading && (
                <div className="mt-6 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue mx-auto"></div>
                    <p className="mt-2 text-gemini-text">Generating your image, please wait...</p>
                </div>
            )}

            {generatedImage && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-4 text-gemini-text">Result:</h3>
                    <img src={generatedImage} alt="Generated" className="rounded-lg shadow-lg w-full max-w-lg mx-auto" />
                </div>
            )}
        </div>
    );
};
