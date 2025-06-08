import type { Route } from "./+types/home";
import { useState, useEffect, useRef, useCallback } from 'react';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "🎤 Scream Game - Test Your Voice!" },
    { name: "description", content: "Scream as loud as you can to reach 100% and win the game!" },
  ];
}

export default function Home() {
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [screamLevel, setScreamLevel] = useState(0);
  const [maxScreamLevel, setMaxScreamLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds game
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const levelDecayRef = useRef<NodeJS.Timeout | null>(null);

  const startMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      setPermissionGranted(true);
      setError(null);
    } catch (err) {
      setError('Microphone access denied or not available. Please allow microphone access to play the game.');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopMicrophone = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const measureAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    
    // Convert to percentage (0-100)
    const level = Math.min(100, Math.max(0, (average / 128) * 100));
    
    setScreamLevel(level);
    setMaxScreamLevel(prev => Math.max(prev, level));

    // Check if player reached 100%
    if (level >= 99 && isGameActive) {
      endGame(true);
      return;
    }

    if (isGameActive) {
      animationFrameRef.current = requestAnimationFrame(measureAudioLevel);
    }
  }, [isGameActive]);

  const startLevelDecay = useCallback(() => {
    if (levelDecayRef.current) {
      clearInterval(levelDecayRef.current);
    }

    levelDecayRef.current = setInterval(() => {
      setScreamLevel(prev => Math.max(0, prev - 2));
    }, 100);
  }, []);

  const startGame = () => {
    setGameStarted(true);
    setIsGameActive(true);
    setScreamLevel(0);
    setMaxScreamLevel(0);
    setTimeLeft(30);
    setFinalScore(null);
    setGameWon(false);
    
    // Start audio measurement
    measureAudioLevel();
    
    // Start level decay
    startLevelDecay();
    
    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const endGame = (won: boolean) => {
    setIsGameActive(false);
    setGameWon(won);
    setFinalScore(maxScreamLevel);
    
    // Clear intervals and animation frames
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (levelDecayRef.current) {
      clearInterval(levelDecayRef.current);
      levelDecayRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const resetGame = () => {
    setGameStarted(false);
    setIsGameActive(false);
    setScreamLevel(0);
    setMaxScreamLevel(0);
    setTimeLeft(30);
    setFinalScore(null);
    setGameWon(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      if (timerRef.current) clearInterval(timerRef.current);
      if (levelDecayRef.current) clearInterval(levelDecayRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Initialize microphone when component mounts
  useEffect(() => {
    startMicrophone();
    return () => stopMicrophone();
  }, []);

  const getBarColor = (level: number) => {
    if (level < 30) return 'bg-green-500';
    if (level < 60) return 'bg-yellow-500';
    if (level < 90) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScreamText = (level: number) => {
    if (level < 10) return 'Silent...';
    if (level < 30) return 'Whisper';
    if (level < 50) return 'Speaking';
    if (level < 70) return 'Loud!';
    if (level < 90) return 'SCREAMING!';
    return 'MAX SCREAM!!!';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-black flex items-center justify-center p-8">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">🎤 SCREAM GAME 🎤</h1>
          <div className="bg-red-600 p-6 rounded-lg max-w-md">
            <p className="text-lg mb-4">{error}</p>
            <button
              onClick={startMicrophone}
              className="bg-white text-red-600 px-6 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!permissionGranted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 to-black flex items-center justify-center p-8">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">🎤 SCREAM GAME 🎤</h1>
          <p className="text-xl mb-8">Please allow microphone access to play!</p>
          <div className="animate-pulse text-6xl">🎤</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-black flex items-center justify-center p-8">
      <div className="text-center text-white max-w-2xl w-full">
        <h1 className="text-6xl font-bold mb-4 animate-pulse">🎤 SCREAM GAME 🎤</h1>
        
        {!gameStarted && !finalScore && (
          <div className="space-y-6">
            <p className="text-xl mb-8">
              Scream as loud as you can to fill the bar to 100%!<br/>
              You have 30 seconds to reach maximum volume!
            </p>
            <button
              onClick={startGame}
              className="bg-red-600 hover:bg-red-700 text-white text-2xl font-bold py-4 px-8 rounded-lg transition-colors animate-bounce"
            >
              START SCREAMING!
            </button>
          </div>
        )}

        {gameStarted && isGameActive && (
          <div className="space-y-6">
            <div className="text-2xl font-bold">
              Time Left: <span className="text-yellow-400">{timeLeft}s</span>
            </div>
            
            <div className="text-4xl font-bold">
              {getScreamText(screamLevel)}
            </div>
            
            <div className="w-full bg-gray-800 rounded-full h-16 overflow-hidden border-4 border-white">
              <div
                className={`h-full transition-all duration-150 ${getBarColor(screamLevel)} flex items-center justify-center`}
                style={{ width: `${screamLevel}%` }}
              >
                <span className="text-white font-bold text-xl">
                  {Math.round(screamLevel)}%
                </span>
              </div>
            </div>
            
            <div className="text-lg">
              Max Reached: <span className="text-yellow-400 font-bold">{Math.round(maxScreamLevel)}%</span>
            </div>
            
            <div className="text-8xl animate-bounce">
              {screamLevel > 50 ? '😱' : screamLevel > 20 ? '😮' : '😐'}
            </div>
          </div>
        )}

        {finalScore !== null && (
          <div className="space-y-6">
            {gameWon ? (
              <div className="space-y-4">
                <div className="text-6xl animate-bounce">🏆</div>
                <h2 className="text-4xl font-bold text-yellow-400">
                  CHAMPION SCREAMER!
                </h2>
                <p className="text-2xl">You reached maximum volume!</p>
                <p className="text-xl">Final Score: <span className="font-bold text-yellow-400">100%</span></p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-6xl">😅</div>
                <h2 className="text-4xl font-bold text-orange-400">
                  Good Try!
                </h2>
                <p className="text-2xl">Your Final Score:</p>
                <p className="text-4xl font-bold text-yellow-400">
                  {Math.round(finalScore)}%
                </p>
                {finalScore >= 80 && <p className="text-xl text-green-400">Excellent scream!</p>}
                {finalScore >= 60 && finalScore < 80 && <p className="text-xl text-yellow-400">Good effort!</p>}
                {finalScore < 60 && <p className="text-xl text-orange-400">Try screaming louder next time!</p>}
              </div>
            )}
            
            <button
              onClick={resetGame}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
