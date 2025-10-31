
import React, { useState, useRef } from 'react';
import { editImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/helpers';

export const ImageEdit: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setOriginalImage({ file, url: URL.createObjectURL(file) });
            setEditedImage(null);
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!prompt || !originalImage) {
            setError('Please upload an image and enter an edit prompt.');
            return;
        }
        setLoading(true);
        setError(null);
        setEditedImage(null);
        try {
            const base64Data = await fileToBase64(originalImage.file);
            const imageUrl = await editImage(prompt, { data: base64Data, mimeType: originalImage.file.type });
            setEditedImage(imageUrl);
        } catch (e) {
            setError('Failed to edit image. Please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6 text-fission-text">Image Editing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold mb-4">1. Upload Image</h3>
                    <div 
                        className="border-2 border-dashed border-fission-purple rounded-lg p-6 text-center cursor-pointer hover:border-fission-cyan transition"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                        {originalImage ? (
                            <img src={originalImage.url} alt="Original" className="max-h-64 mx-auto rounded-md" />
                        ) : (
                            <p className="text-gray-400">Click to upload an image</p>
                        )}
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-4">2. Describe Your Edit</h3>
                     <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Add a retro filter, or remove the person in the background"
                        className="w-full p-3 bg-fission-dark text-fission-text rounded-md border border-fission-purple focus:ring-2 focus:ring-fission-cyan focus:outline-none transition"
                        rows={5}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !originalImage}
                        className="w-full mt-4 bg-fission-cyan hover:bg-fission-pink text-fission-dark font-bold py-3 px-6 rounded-md transition-colors disabled:bg-fission-purple disabled:cursor-not-allowed"
                    >
                        {loading ? 'Generating...' : 'Generate Edit'}
                    </button>
                </div>
            </div>

            {error && <div className="mt-6 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}

             {loading && (
                <div className="mt-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fission-cyan mx-auto"></div>
                    <p className="mt-2 text-fission-text">Applying your edits, please wait...</p>
                </div>
            )}
            
            {editedImage && (
                <div className="mt-8">
                    <h3 className="text-2xl font-semibold mb-4 text-center">Result</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                         <div>
                            <h4 className="text-lg font-medium mb-2 text-center">Original</h4>
                            <img src={originalImage!.url} alt="Original" className="rounded-lg shadow-lg w-full mx-auto" />
                         </div>
                         <div>
                            <h4 className="text-lg font-medium mb-2 text-center">Edited</h4>
                            <img src={editedImage} alt="Edited" className="rounded-lg shadow-lg w-full mx-auto" />
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};