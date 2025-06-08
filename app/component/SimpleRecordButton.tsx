import { useState, useEffect, useRef } from "react";

function SimpleRecordButton() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const RECORDING_MAX_DURATION = 240; // 4 minutes in seconds

  useEffect(() => {
    if (!audioStream) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream: MediaStream) => {
          setAudioStream(stream);
          const mediaRecorder = new MediaRecorder(stream);
          setMediaRecorder(mediaRecorder);
          let audio: BlobPart[];

          mediaRecorder.ondataavailable = (event: BlobEvent) => {
            if (event.data.size > 0) {
              audio = [event.data];
            }
          };

          mediaRecorder.onstop = (event: Event) => {
            const b = new Blob(audio, { type: "audio/wav" });
            setAudioBlob(b);
            console.log("audioBlob", b);
          };
        })
        .catch((error: Error) => {
          console.error("Error accessing microphone:", error);
        });
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioStream]);

  const handleToggleRecording = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => {
          if (prevTime >= RECORDING_MAX_DURATION - 1) {
            stopRecording();
            return RECORDING_MAX_DURATION;
          }
          return prevTime + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div>
      <button
        onClick={handleToggleRecording}
        className={`bg-red-400 hover:opacity-80 text-white font-bold py-2 px-4 rounded`}
      >
        {isRecording ? (
          <>
            <span className={`mr-3 ${isRecording && "animate-pulse"}`}>●</span>{" "}
            Stop Recording
          </>
        ) : audioBlob ? (
          "Redo recording"
        ) : (
          "Start Recording"
        )}
      </button>
      <div>
        {isRecording && (
          <div>
            <p>Recording...</p>
            <p>Time: {formatTime(recordingTime)}</p>
          </div>
        )}
      </div>
      {audioBlob && (
        <>
          <div>Preview recording before submitting:</div>
          <audio controls>
            <source src={URL.createObjectURL(audioBlob)} type="audio/wav" />
          </audio>
        </>
      )}
    </div>
  );
}

export default SimpleRecordButton;
