
import React, { useState } from 'react';
import { generateImage } from '../services/geminiService';
import { Spinner } from './Spinner';

const promptSuggestions = [
    "A majestic lion wearing a crown, sitting on a throne in a futuristic city.",
    "An oil painting of a serene cherry blossom garden at night, with a glowing full moon.",
    "A synthwave-style illustration of a retro sports car driving into a sunset.",
    "A cute, fluffy alien creature exploring a vibrant, candy-colored forest.",
];

const stylePresets = [
    { name: 'Photorealistic', prompt: ', photorealistic, 8k, hyper-detailed, cinematic lighting' },
    { name: 'Anime', prompt: ', anime style, vibrant colors, detailed line art, key visual' },
    { name: 'Cyberpunk', prompt: ', cyberpunk style, neon lights, dystopian future, high-tech low-life' },
    { name: 'Fantasy Art', prompt: ', fantasy art, epic, detailed, magical, D&D character art' },
    { name: 'Watercolor', prompt: ', watercolor painting, soft edges, vibrant washes of color' },
    { name: 'Pixel Art', prompt: ', pixel art, 16-bit, retro gaming aesthetic' },
    { name: 'Minimalist', prompt: ', minimalist, clean lines, simple, elegant' },
    { name: '3D Render', prompt: ', 3d render, octane render, trending on artstation, cinematic' },
    { name: 'Comic Book', prompt: ', comic book style, bold lines, vibrant colors, halftone dots' },
];


export const ImageGen: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
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
        
        let finalPrompt = prompt;
        const activeStyle = stylePresets.find(s => s.name === selectedStyle);
        if (activeStyle) {
            finalPrompt += activeStyle.prompt;
        }

        try {
            const imageUrl = await generateImage(finalPrompt, aspectRatio);
            setGeneratedImage(imageUrl);
        } catch (e) {
            setError('Failed to generate image. Please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    
    const handleSuggestionClick = (suggestion: string) => {
        setPrompt(suggestion);
    };

    const handleStyleClick = (styleName: string) => {
        setSelectedStyle(prevStyle => prevStyle === styleName ? null : styleName);
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-fission-text">Image Generation</h2>
            <div className="bg-fission-dark-secondary p-6 rounded-lg shadow-lg">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A robot holding a red skateboard."
                    className="w-full p-3 bg-fission-dark text-fission-text rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none transition"
                    rows={3}
                />
                
                <div className="my-4">
                    <p className="text-sm text-gray-400 mb-2">Need inspiration? Try one of these:</p>
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

                <div className="my-4 border-t border-fission-purple pt-4">
                    <p className="text-sm text-gray-400 mb-2">Add a style:</p>
                    <div className="flex flex-wrap gap-2">
                        {stylePresets.map((style) => (
                            <button
                                key={style.name}
                                onClick={() => handleStyleClick(style.name)}
                                className={`py-2 px-4 rounded-md transition-colors text-sm font-semibold ${
                                    selectedStyle === style.name 
                                    ? 'bg-fission-cyan text-fission-dark' 
                                    : 'bg-fission-dark hover:bg-fission-purple text-fission-text'
                                }`}
                            >
                                {style.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 border-t border-fission-purple pt-4">
                     <div className="flex items-center">
                        <label htmlFor="aspectRatio" className="mr-2 text-fission-text">Aspect Ratio:</label>
                        <select
                            id="aspectRatio"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value)}
                            className="bg-fission-dark text-fission-text p-2 rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none"
                        >
                            <option value="1:1">1:1 (Square)</option>
                            <option value="16:9">16:9 (Widescreen)</option>
                            <option value="9:16">9:16 (Vertical)</option>
                            <option value="4:3">4:3 (Standard)</option>
                            <option value="3:4">3:4 (Portrait)</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-fission-cyan hover:bg-fission-pink text-fission-dark font-bold py-2 px-6 rounded-md transition-colors disabled:bg-fission-purple disabled:cursor-not-allowed"
                    >
                        {loading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
            </div>

            {error && <div className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}

            {loading && <Spinner message="Generating your image, please wait..." />}

            {generatedImage && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-4 text-fission-text">Result:</h3>
                    <img src={generatedImage} alt="Generated" className="rounded-lg shadow-lg w-full max-w-lg mx-auto" />
                </div>
            )}
        </div>
    );
};
