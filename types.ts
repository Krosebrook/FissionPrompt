export enum Tab {
  ImageGen = 'imageGen',
  ImageEdit = 'imageEdit',
  VideoGen = 'videoGen',
  Chat = 'chat',
  LiveConvo = 'liveConvo',
  MediaAnalysis = 'mediaAnalysis',
  Tts = 'tts',
  AudioTranscription = 'audioTranscription'
}

export interface ChatMessage {
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
  groundingChunks?: GroundingChunk[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets?: {
            uri: string;
            text: string;
        }[];
    }[]
  };
}

export interface VeoGeneratedVideo {
    video: {
        uri: string;
        aspectRatio: string;
    }
}