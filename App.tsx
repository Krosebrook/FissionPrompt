
import React, { useState } from 'react';
import { ImageGen } from './components/ImageGen';
import { ImageEdit } from './components/ImageEdit';
import { VideoGen } from './components/VideoGen';
import { Chat } from './components/Chat';
import { LiveConvo } from './components/LiveConvo';
import { MediaAnalysis } from './components/MediaAnalysis';
import { Tts } from './components/Tts';
import { AudioTranscription } from './components/AudioTranscription';
import { Tab } from './types';
import { FissionPromptIcon, ImageSquareIcon, VideoCameraIcon, ChatBubbleIcon, MicrophoneIcon, DocumentMagnifyingGlassIcon, SpeakerWaveIcon, MusicalNoteIcon, CpuChipIcon } from './components/Icons';
import { FunctionCalling } from './components/FunctionCalling';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Chat);

  const renderTabContent = () => {
    switch (activeTab) {
      case Tab.ImageGen:
        return <ImageGen />;
      case Tab.ImageEdit:
        return <ImageEdit />;
      case Tab.VideoGen:
        return <VideoGen />;
      case Tab.Chat:
        return <Chat />;
      case Tab.FunctionCalling:
        return <FunctionCalling />;
      case Tab.LiveConvo:
        return <LiveConvo />;
      case Tab.MediaAnalysis:
        return <MediaAnalysis />;
      case Tab.Tts:
        return <Tts />;
      case Tab.AudioTranscription:
        return <AudioTranscription />;
      default:
        return <Chat />;
    }
  };

  const tabs = [
    { id: Tab.Chat, name: 'Chat', icon: <ChatBubbleIcon /> },
    { id: Tab.FunctionCalling, name: 'Function Calling', icon: <CpuChipIcon /> },
    { id: Tab.ImageGen, name: 'Image Gen', icon: <ImageSquareIcon /> },
    { id: Tab.ImageEdit, name: 'Image Edit', icon: <ImageSquareIcon /> },
    { id: Tab.VideoGen, name: 'Video Gen', icon: <VideoCameraIcon /> },
    { id: Tab.LiveConvo, name: 'Live Conversation', icon: <MicrophoneIcon /> },
    { id: Tab.MediaAnalysis, name: 'Media Analysis', icon: <DocumentMagnifyingGlassIcon /> },
    { id: Tab.AudioTranscription, name: 'Audio Transcription', icon: <MusicalNoteIcon /> },
    { id: Tab.Tts, name: 'Text-to-Speech', icon: <SpeakerWaveIcon /> },
  ];

  return (
    <div className="flex flex-col h-screen bg-fission-dark font-sans">
      <header className="flex items-center p-4 border-b border-fission-dark-secondary">
        <FissionPromptIcon />
        <h1 className="text-xl font-semibold ml-2 text-fission-text">FissionPrompt</h1>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-64 p-4 border-r border-fission-dark-secondary overflow-y-auto">
          <ul>
            {tabs.map(tab => (
              <li key={tab.id} className="mb-2">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center text-left p-3 rounded-lg transition-colors duration-200 ${
                    activeTab === tab.id ? 'bg-fission-cyan text-fission-dark' : 'hover:bg-fission-dark-secondary text-fission-text'
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <main className="flex-1 p-6 overflow-y-auto">
          {renderTabContent()}
        </main>
      </div>
    </div>
  );
};

export default App;