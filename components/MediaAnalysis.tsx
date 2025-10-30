
import React, { useState, useRef } from 'react';
import { analyzeImage, analyzeVideo } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';

type AnalysisType = 'image' | 'video';

export const MediaAnalysis: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [mediaFile, setMediaFile] = useState<{ file: File; url: string } | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisType, setAnalysisType] = useState<AnalysisType>('image');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setMediaFile({ file, url: URL.createObjectURL(file) });
            setAnalysisResult(null);
            setError(null);
        }
    };
    
    const handleAnalyze = async () => {
        if (!prompt || !mediaFile) {
            setError(`Please upload a${analysisType === 'image' ? 'n image' : ' video'} and enter a prompt.`);
            return;
        }
        setLoading(true);
        setError(null);
        setAnalysisResult(null);
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
            setLoading(false);
        }
    };

    const switchType = (type: AnalysisType) => {
        setAnalysisType(type);
        setMediaFile(null);
        setAnalysisResult(null);
        setError(null);
        setPrompt('');
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6">Media Analysis</h2>
            <div className="flex mb-4 border-b border-gray-700">
                <button onClick={() => switchType('image')} className={`px-4 py-2 ${analysisType === 'image' ? 'border-b-2 border-gemini-blue text-gemini-blue' : 'text-gray-400'}`}>Analyze Image</button>
                <button onClick={() => switchType('video')} className={`px-4 py-2 ${analysisType === 'video' ? 'border-b-2 border-gemini-blue text-gemini-blue' : 'text-gray-400'}`}>Analyze Video</button>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div 
                    className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-gemini-blue transition mb-4"
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
                        <p className="text-gray-400">Click to upload a{analysisType === 'image' ? 'n image' : ' video'}</p>
                    )}
                </div>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`e.g., What is happening in this ${analysisType}?`}
                    className="w-full p-3 bg-gray-700 text-gemini-text rounded-md border border-gray-600 focus:ring-2 focus:ring-gemini-blue focus:outline-none transition"
                    rows={3}
                />
                 <button
                    onClick={handleAnalyze}
                    disabled={loading || !mediaFile}
                    className="w-full mt-4 bg-gemini-blue hover:bg-gemini-dark-blue text-white font-bold py-3 px-6 rounded-md transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {loading ? 'Analyzing...' : `Analyze ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)}`}
                </button>
            </div>

            {error && <div className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}

            {loading && (
                <div className="mt-6 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue mx-auto"></div>
                    <p className="mt-2 text-gemini-text">Analyzing your media, please wait...</p>
                </div>
            )}

            {analysisResult && (
                <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">Analysis Result:</h3>
                    <p className="whitespace-pre-wrap">{analysisResult}</p>
                </div>
            )}
        </div>
    );
};
