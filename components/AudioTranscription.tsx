
import React, { useState, useRef } from 'react';
import { transcribeAudio } from '../services/geminiService';
import { blobToBase64 } from '../utils/helpers';

export const AudioTranscription: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const handleStartRecording = async () => {
        if (isRecording) return;
        setTranscription(null);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = event => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = handleStopRecording;
            audioChunksRef.current = [];
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            setError('Could not access microphone. Please grant permission.');
        }
    };

    const handleStopRecording = async () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            // The rest of the logic is in onstop to ensure it runs after the final chunk is available.
            setIsRecording(false);
            setLoading(true);

            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            try {
                const base64Data = await blobToBase64(audioBlob);
                const result = await transcribeAudio({ data: base64Data, mimeType: 'audio/webm' });
                setTranscription(result);
            } catch (e) {
                setError('Failed to transcribe audio.');
                console.error(e);
            } finally {
                setLoading(false);
                audioChunksRef.current = [];
                 // Stop media tracks to turn off mic icon
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
        }
    };

    const toggleRecording = () => {
        if(isRecording) {
            handleStopRecording();
        } else {
            handleStartRecording();
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h2 className="text-3xl font-bold mb-6">Audio Transcription</h2>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
                <button
                    onClick={toggleRecording}
                    className={`px-8 py-4 rounded-full font-bold text-white transition-colors text-xl ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gemini-blue hover:bg-gemini-dark-blue'}`}
                >
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
                {isRecording && <p className="text-gray-400 mt-4 animate-pulse">Recording in progress...</p>}
            </div>

            {error && <div className="mt-4 text-red-400 bg-red-900/50 p-3 rounded-md">{error}</div>}

            {loading && (
                <div className="mt-6 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue mx-auto"></div>
                    <p className="mt-2 text-gemini-text">Transcribing audio...</p>
                </div>
            )}

            {transcription && (
                <div className="mt-6 bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4">Transcription:</h3>
                    <p className="whitespace-pre-wrap">{transcription}</p>
                </div>
            )}
        </div>
    );
};
