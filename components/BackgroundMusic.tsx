import React, { useState, useRef, useEffect } from 'react';
import { backgroundMusic } from '../assets/music';
import { SpeakerWaveIcon, SpeakerXMarkIcon } from './Icons';

export const BackgroundMusic: React.FC = () => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.2); // Start at a low volume
    const [showSlider, setShowSlider] = useState(false);

    useEffect(() => {
        // Initialize audio element
        audioRef.current = new Audio(backgroundMusic);
        audioRef.current.loop = true;
        audioRef.current.volume = volume;

        return () => {
            // Cleanup on unmount
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            // Play might fail if user hasn't interacted with the page yet
            audioRef.current.play().catch(error => console.error("Audio play failed:", error));
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div 
            className="fixed bottom-4 right-4 z-50 flex items-center space-x-2 group"
            onMouseEnter={() => setShowSlider(true)}
            onMouseLeave={() => setShowSlider(false)}
        >
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showSlider ? 'max-w-xs w-32' : 'max-w-0 w-0'}`}>
                 <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-fission-purple rounded-lg appearance-none cursor-pointer accent-fission-cyan"
                    aria-label="Volume control"
                />
            </div>
            <button
                onClick={togglePlay}
                className="p-3 bg-fission-dark-secondary rounded-full shadow-lg hover:bg-fission-purple transition-colors"
                aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
            >
                {isPlaying ? <SpeakerWaveIcon /> : <SpeakerXMarkIcon />}
            </button>
        </div>
    );
};
