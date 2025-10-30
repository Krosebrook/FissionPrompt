
import { GoogleGenAI, GenerateContentResponse, Chat, Modality, Type, VideosOperationResponse, VeoGeneratedVideo, GroundingChunk, LiveSession } from "@google/genai";
import { ChatMessage } from "../types";

const getAIClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- IMAGE GENERATION ---
export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
    const ai = getAIClient();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
        },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
        throw new Error("Image generation failed");
    }
    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
};

// --- IMAGE EDITING ---
export const editImage = async (prompt: string, image: { data: string, mimeType: string }): Promise<string> => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: image.data, mimeType: image.mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
    }
    throw new Error("Image editing failed");
};

// --- VIDEO GENERATION ---
export const generateVideo = async (prompt: string, aspectRatio: "16:9" | "9:16", image?: { data: string, mimeType: string }): Promise<VideosOperationResponse> => {
    const ai = getAIClient();
    const requestPayload: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio,
        }
    };

    if (image) {
        requestPayload.image = {
            imageBytes: image.data,
            mimeType: image.mimeType,
        };
    }
    
    return await ai.models.generateVideos(requestPayload);
};

export const getVideosOperation = async (operation: VideosOperationResponse): Promise<VideosOperationResponse> => {
    const ai = getAIClient();
    return await ai.operations.getVideosOperation({ operation });
};


// --- CHAT ---
export const generateChatResponse = async (history: ChatMessage[], latestMessage: string, useSearch: boolean, useMaps: boolean, useThinking: boolean, userLocation?: {latitude: number, longitude: number}): Promise<{text: string; groundingChunks?: GroundingChunk[]}> => {
    const ai = getAIClient();
    const modelName = useThinking ? 'gemini-2.5-pro' : (useSearch || useMaps ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite');

    const contents = [...history.map(msg => ({
        role: msg.sender,
        parts: [{ text: msg.text }]
    })), { role: 'user', parts: [{ text: latestMessage }] }];

    const config: any = {};
    if (useThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    if (useSearch || useMaps) {
        config.tools = [];
        if (useSearch) config.tools.push({ googleSearch: {} });
        if (useMaps) config.tools.push({ googleMaps: {} });
        if (useMaps && userLocation) {
             config.toolConfig = {
                retrievalConfig: {
                    latLng: userLocation,
                }
            }
        }
    }

    const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
    });
    
    return {
        text: response.text,
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] || undefined
    };
};

// --- MEDIA ANALYSIS ---
export const analyzeImage = async (prompt: string, image: { data: string, mimeType: string }): Promise<string> => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { data: image.data, mimeType: image.mimeType } },
                { text: prompt },
            ],
        },
    });
    return response.text;
};

// This is a placeholder for actual video understanding which requires more complex handling (e.g., frame sampling).
// For this app, we will use a simplified approach assuming a single frame can be processed.
export const analyzeVideo = async (prompt: string, video: { data: string, mimeType: string }): Promise<string> => {
     const ai = getAIClient();
     // NOTE: This is a simplified approach. True video analysis would involve
     // chunking the video or using a model that directly accepts video files.
     // For now, we are sending the video file as if it's a large blob,
     // which gemini-2.5-pro can handle to some extent.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [
            {
                role: 'user',
                parts: [
                    { inlineData: { mimeType: video.mimeType, data: video.data } },
                    { text: prompt }
                ]
            }
        ]
    });
    return response.text;
};

// --- TEXT-TO-SPEECH ---
export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("TTS generation failed");
    }
    return base64Audio;
};


// --- AUDIO TRANSCRIPTION ---
export const transcribeAudio = async (audio: { data: string, mimeType: string }): Promise<string> => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: "Transcribe this audio." },
                { inlineData: { data: audio.data, mimeType: audio.mimeType } }
            ]
        },
    });
    return response.text;
};

// --- LIVE CONVERSATION ---
export const connectLive = (callbacks: any): Promise<LiveSession> => {
    const ai = getAIClient();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: 'You are a friendly and helpful AI assistant.',
        },
    });
};
