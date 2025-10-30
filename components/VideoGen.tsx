
import React, { useState, useEffect, useRef } from 'react';
import { generateVideo, getVideosOperation } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { VeoGeneratedVideo } from '../types';
import type { VideosOperationResponse } from '@google/genai';


const loadingMessages = [
    "Warming up the digital director's chair...",
    "Choreographing pixels into motion...",
    "Rendering your cinematic masterpiece...",
    "Applying the final digital polish...",
    "Almost ready for the premiere...",
];

export const VideoGen: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [image, setImage] = useState<{ file: File; url: string } | null>(null);
    const [generatedVideo, setGeneratedVideo] = useState<VeoGeneratedVideo | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const [error, setError] = useState<string | null>(null);
    const [apiKeySelected, setApiKeySelected] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollingIntervalRef = useRef<number | null>(null);
    const messageIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                setApiKeySelected(true);
            }
        };
        checkApiKey();
        
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        };
    }, []);
    
    useEffect(() => {
        if (loading) {
            let i = 0;
            setLoadingMessage(loadingMessages[i]);
            messageIntervalRef.current = window.setInterval(() => {
                i = (i + 1) % loadingMessages.length;
                setLoadingMessage(loadingMessages[i]);
            }, 5000);
        } else {
            if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        }
    }, [loading]);


    const handleSelectKey = async () => {
        if(window.aistudio) {
            await window.aistudio.openSelectKey();
            // Assume success to avoid race condition
            setApiKeySelected(true);
        } else {
            setError("AI Studio context not found. This feature may not work in this environment.");
        }
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImage({ file, url: URL.createObjectURL(file) });
        }
    };

    const pollOperation = (operation: VideosOperationResponse) => {
        pollingIntervalRef.current = window.setInterval(async () => {
            try {
                const updatedOperation = await getVideosOperation(operation);
                if (updatedOperation.done) {
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    setLoading(false);
                    const video = updatedOperation.response?.generatedVideos?.[0];
                    if (video) {
                        setGeneratedVideo(video);
                    } else {
                         setError("Video generation finished but no video was returned.");
                    }
                }
            } catch (e: any) {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                setLoading(false);
                setError(`Polling failed: ${e.message}`);
            }
        }, 10000);
    };

    const handleGenerate = async () => {
        if (!prompt && !image) {
            setError('Please enter a prompt or upload an image.');
            return;
        }
        setLoading(true);
        setError(null);
        setGeneratedVideo(null);
        
        try {
            const imagePayload = image ? { data: await fileToBase64(image.file), mimeType: image.file.type } : undefined;
            const operation = await generateVideo(prompt, aspectRatio, imagePayload);
            pollOperation(operation);
        } catch (e: any) {
             if(e.message?.includes("Requested entity was not found")){
                setError("API Key validation failed. Please select a valid key.");
                setApiKeySelected(false);
             } else {
                setError(`Failed to start video generation: ${e.message}`);
             }
            setLoading(false);
        }
    };

    if (!apiKeySelected) {
        return (
             <div className="max-w-2xl mx-auto p-4 text-center">
                <h2 className="text-3xl font-bold mb-4 text-gemini-text">Video Generation with Veo</h2>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <p className="mb-4">To use this feature, you need to select an API key. Video generation is a billable service.</p>
                    <p className="text-sm text-gray-400 mb-6">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-gemini-blue hover:underline">billing documentation</a>.</p>
                    <button
                        onClick={handleSelectKey}
                        className="bg-gemini-blue hover:bg-gemini-dark-blue text-white font-bold py-2 px-6 rounded-md transition-colors"
                    >
                        Select API Key
                    </button>
                    {error && <div className="mt-4 text-red-400">{error}</div>}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-gemini-text">Video Generation</h2>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A neon hologram of a cat driving at top speed."
                    className="w-full p-3 bg-gray-700 text-gemini-text rounded-md border border-gray-600 focus:ring-2 focus:ring-gemini-blue focus:outline-none transition"
                    rows={3}
                />
                <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Optional Starting Image</h3>
                    <div 
                        className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-gemini-blue transition"
                        onClick={() => fileInputRef.current?.click()}
                    >
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                         {image ? (
                            <img src={image.url} alt="Starting frame" className="max-h-32 mx-auto rounded-md" />
                        ) : (
                            <p className="text-gray-400">Click to upload an image</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                     <div className="flex items-center">
                        <label htmlFor="aspectRatioVid" className="mr-2 text-gemini-text">Aspect Ratio:</label>
                        <select
                            id="aspectRatioVid"
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16')}
                            className="bg-gray-700 text-gemini-text p-2 rounded-md border border-gray-600 focus:ring-2 focus:ring-gemini-blue focus:outline-none"
                        >
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-gemini-blue hover:bg-gemini-dark-blue text-white font-bold py-2 px-6 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Generating...' : 'Generate Video'}
                    </button>
                </div>
            </div>

            {error && <div className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}

            {loading && (
                <div className="mt-6 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue mx-auto"></div>
                    <p className="mt-4 text-gemini-text text-lg">{loadingMessage}</p>
                    <p className="text-sm text-gray-400 mt-2">Video generation can take a few minutes. Please be patient.</p>
                </div>
            )}
            
            {generatedVideo && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-4 text-gemini-text">Result:</h3>
                    <video 
                      controls 
                      src={`${generatedVideo.video.uri}&key=${process.env.API_KEY}`} 
                      className="rounded-lg shadow-lg w-full max-w-lg mx-auto"
                    />
                </div>
            )}
        </div>
    );
};
