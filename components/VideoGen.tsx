
import React, { useState, useEffect, useRef } from 'react';
import { generateVideo, getVideosOperation } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { VeoGeneratedVideo } from '../types';
import type { VideosOperationResponse } from '@google/genai';
import { Spinner } from './Spinner';


const loadingMessages = [
    "Warming up the digital director's chair...",
    "Choreographing pixels into motion...",
    "Rendering your cinematic masterpiece...",
    "Applying the final digital polish...",
    "Almost ready for the premiere...",
];

const visualStyles = [
    { value: 'none', label: 'Default' },
    { value: 'cinematic', label: 'Cinematic' },
    { value: 'photorealistic', label: 'Photorealistic' },
    { value: 'anime', label: 'Anime' },
    { value: 'synthwave', label: 'Synthwave' },
    { value: 'vaporwave', label: 'Vaporwave' },
    { value: 'steampunk', label: 'Steampunk' },
    { value: 'cyberpunk', label: 'Cyberpunk' },
    { value: 'impressionistic', label: 'Impressionistic' },
    { value: 'claymation', label: 'Claymation' },
    { value: 'black and white', label: 'Black and White' },
    { value: 'futuristic', label: 'Futuristic' },
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'documentary', label: 'Documentary' },
    { value: 'abstract', label: 'Abstract' },
];

export const VideoGen: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
    const [image, setImage] = useState<{ file: File; url: string } | null>(null);
    const [duration, setDuration] = useState(4);
    const [style, setStyle] = useState('none');
    const [generatedVideo, setGeneratedVideo] = useState<VeoGeneratedVideo | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);
    const [error, setError] = useState<string | null>(null);
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

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
            let finalPrompt = prompt;
            if (prompt) {
                const styleText = style !== 'none' ? ` in a ${style} style` : '';
                const durationText = `, ${duration} seconds long`;
                finalPrompt = `${prompt}${styleText}${durationText}`;
            }
            
            const imagePayload = image ? { data: await fileToBase64(image.file), mimeType: image.file.type } : undefined;
            const operation = await generateVideo(finalPrompt, aspectRatio, resolution, imagePayload);
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

    const handleSaveVideo = async () => {
        if (!generatedVideo) return;
        setIsDownloading(true);
        setError(null);
        try {
            const response = await fetch(`${generatedVideo.video.uri}&key=${process.env.API_KEY}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch video: ${response.statusText}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `fissionprompt-video-${timestamp}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (e: any) {
            setError(`Failed to download video: ${e.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!apiKeySelected) {
        return (
             <div className="max-w-2xl mx-auto p-4 text-center">
                <h2 className="text-3xl font-bold mb-4 text-fission-text">Video Generation with Veo</h2>
                <div className="bg-fission-dark-secondary p-6 rounded-lg shadow-lg">
                    <p className="mb-4">To use this feature, you need to select an API key. Video generation is a billable service.</p>
                    <p className="text-sm text-gray-400 mb-6">For more information, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-fission-cyan hover:underline">billing documentation</a>.</p>
                    <button
                        onClick={handleSelectKey}
                        className="bg-fission-cyan hover:bg-fission-pink text-fission-dark font-bold py-2 px-6 rounded-md transition-colors"
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
            <h2 className="text-3xl font-bold mb-6 text-fission-text">Video Generation</h2>
            <div className="bg-fission-dark-secondary p-6 rounded-lg shadow-lg">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A neon hologram of a cat driving at top speed."
                    className="w-full p-3 bg-fission-dark text-fission-text rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none transition"
                    rows={3}
                />
                
                <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2 text-fission-text">Optional Starting Image</h3>
                    <div 
                        className="border-2 border-dashed border-fission-purple rounded-lg p-4 text-center cursor-pointer hover:border-fission-cyan transition"
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

                <div className="mt-6 border-t border-fission-purple pt-4">
                    <h3 className="text-lg font-medium mb-4 text-fission-text">Generation Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-fission-text mb-2">Duration ({duration}s)</label>
                            <input
                                id="duration"
                                type="range"
                                min="2"
                                max="15"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="w-full h-2 bg-fission-purple rounded-lg appearance-none cursor-pointer accent-fission-cyan"
                            />
                        </div>
                        <div>
                            <label htmlFor="style" className="block text-sm font-medium text-fission-text mb-2">Visual Style</label>
                            <select
                                id="style"
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                className="w-full bg-fission-dark text-fission-text p-2 rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none"
                            >
                                {visualStyles.map(s => (
                                   <option key={s.value} value={s.value}>{s.label}</option>
                               ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="aspectRatioVid" className="block text-sm font-medium text-fission-text mb-2">Aspect Ratio</label>
                            <select
                                id="aspectRatioVid"
                                value={aspectRatio}
                                onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16')}
                                className="w-full bg-fission-dark text-fission-text p-2 rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none"
                            >
                                <option value="16:9">16:9 (Landscape)</option>
                                <option value="9:16">9:16 (Portrait)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="resolutionVid" className="block text-sm font-medium text-fission-text mb-2">Quality</label>
                            <select
                                id="resolutionVid"
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value as '720p' | '1080p')}
                                className="w-full bg-fission-dark text-fission-text p-2 rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none"
                            >
                                <option value="720p">Standard (720p)</option>
                                <option value="1080p">HD (1080p)</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6">
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full bg-fission-cyan hover:bg-fission-pink text-fission-dark font-bold py-3 px-6 rounded-md transition-colors disabled:bg-fission-purple disabled:cursor-not-allowed text-lg"
                    >
                        {loading ? 'Generating...' : 'Generate Video'}
                    </button>
                </div>
            </div>

            {error && <div className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}

            {loading && (
                <Spinner 
                    message={loadingMessage} 
                    subMessage="Video generation can take a few minutes. Please be patient." 
                />
            )}
            
            {generatedVideo && (
                <div className="mt-6 text-center">
                    <h3 className="text-xl font-semibold mb-4 text-fission-text">Result:</h3>
                    <video 
                      controls 
                      src={`${generatedVideo.video.uri}&key=${process.env.API_KEY}`} 
                      className="rounded-lg shadow-lg w-full max-w-lg mx-auto"
                    />
                    <button
                        onClick={handleSaveVideo}
                        disabled={isDownloading}
                        className="mt-4 bg-fission-cyan-dark hover:bg-fission-pink text-fission-dark font-bold py-2 px-6 rounded-md transition-colors disabled:bg-fission-purple disabled:cursor-not-allowed"
                    >
                        {isDownloading ? 'Downloading...' : 'Save Video'}
                    </button>
                </div>
            )}
        </div>
    );
};
