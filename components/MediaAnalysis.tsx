import React, { useState, useRef } from 'react';
import { analyzeImage, analyzeVideo, generateImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';
import { Spinner } from './Spinner';

type AnalysisType = 'image' | 'video';

export const MediaAnalysis: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [mediaFile, setMediaFile] = useState<{ file: File; url: string } | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [action, setAction] = useState<'analyze' | 'generate' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [analysisType, setAnalysisType] = useState<AnalysisType>('image');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setMediaFile({ file, url: URL.createObjectURL(file) });
            setAnalysisResult(null);
            setGeneratedImage(null);
            setError(null);
        }
    };
    
    const handleAnalyze = async () => {
        if (!prompt || !mediaFile) {
            setError(`Please upload a${analysisType === 'image' ? 'n image' : ' video'} and enter a prompt.`);
            return;
        }
        setAction('analyze');
        setError(null);
        setAnalysisResult(null);
        setGeneratedImage(null);
        try {
            const base64Data = await fileToBase64(mediaFile.file);
            let result;
            if (analysisType === 'image') {
                result = await analyzeImage(prompt, { data: base64Data, mimeType: mediaFile.file.type });
            } else {
                result = await analyzeVideo(prompt, { data: base64Data, mimeType: mediaFile.file.type });
            }
            setAnalysisResult(result);
        } catch (e) {
            setError(`Failed to analyze ${analysisType}. Please try again.`);
            console.error(e);
        } finally {
            setAction(null);
        }
    };

    const handleGenerateImage = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt to generate an image.');
            return;
        }
        setAction('generate');
        setError(null);
        setAnalysisResult(null);
        setGeneratedImage(null);
        try {
            const imageUrl = await generateImage(prompt, '1:1');
            setGeneratedImage(imageUrl);
        } catch (e) {
            setError('Failed to generate image. Please try again.');
            console.error(e);
        } finally {
            setAction(null);
        }
    };

    const switchType = (type: AnalysisType) => {
        setAnalysisType(type);
        setMediaFile(null);
        setAnalysisResult(null);
        setGeneratedImage(null);
        setError(null);
        setPrompt('');
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6">Media Analysis & Generation</h2>
            <div className="flex mb-4 border-b border-fission-dark-secondary">
                <button onClick={() => switchType('image')} className={`px-4 py-2 ${analysisType === 'image' ? 'border-b-2 border-fission-cyan text-fission-cyan' : 'text-gray-400'}`}>Analyze Image</button>
                <button onClick={() => switchType('video')} className={`px-4 py-2 ${analysisType === 'video' ? 'border-b-2 border-fission-cyan text-fission-cyan' : 'text-gray-400'}`}>Analyze Video</button>
            </div>
            
            <div className="bg-fission-dark-secondary p-6 rounded-lg shadow-lg">
                <div 
                    className="border-2 border-dashed border-fission-purple rounded-lg p-6 text-center cursor-pointer hover:border-fission-cyan transition mb-4"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept={analysisType === 'image' ? 'image/*' : 'video/*'}
                        className="hidden"
                    />
                    {mediaFile ? (
                        analysisType === 'image' ? 
                        <img src={mediaFile.url} alt="To be analyzed" className="max-h-64 mx-auto rounded-md" /> :
                        <video src={mediaFile.url} controls className="max-h-64 mx-auto rounded-md" />
                    ) : (
                        <p className="text-gray-400">Click to upload a{analysisType === 'image' ? 'n image' : ' video'} for analysis</p>
                    )}
                </div>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`e.g., "Describe this image" or "A photo of a cat astronaut"`}
                    className="w-full p-3 bg-fission-dark text-fission-text rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none transition"
                    rows={3}
                />
                 <div className="flex w-full mt-4 gap-4">
                    <button
                        onClick={handleAnalyze}
                        disabled={action !== null || !mediaFile}
                        className="w-1/2 bg-fission-cyan hover:bg-fission-pink text-fission-dark font-bold py-3 px-6 rounded-md transition-colors disabled:bg-fission-purple disabled:cursor-not-allowed"
                    >
                        {action === 'analyze' ? 'Analyzing...' : `Analyze Media`}
                    </button>
                    <button
                        onClick={handleGenerateImage}
                        disabled={action !== null || !prompt.trim()}
                        className="w-1/2 bg-fission-purple hover:bg-fission-pink text-fission-text font-bold py-3 px-6 rounded-md transition-colors disabled:bg-fission-dark-secondary disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                        {action === 'generate' ? 'Generating...' : `Generate Image`}
                    </button>
                 </div>
            </div>

            {error && <div className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}

            {action === 'analyze' && <Spinner message="Analyzing your media..." />}
            {action === 'generate' && <Spinner message="Generating your image..." />}

            {analysisResult && (
                <div className="mt-6 bg-fission-dark-secondary p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">Analysis Result:</h3>
                    <p className="whitespace-pre-wrap">{analysisResult}</p>
                </div>
            )}

            {generatedImage && (
                <div className="mt-6 bg-fission-dark-secondary p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-center">Generated Image:</h3>
                    <div className="flex justify-center">
                        <img src={generatedImage} alt="Generated" className="rounded-lg shadow-lg w-full max-w-lg" />
                    </div>
                </div>
            )}
        </div>
    );
};