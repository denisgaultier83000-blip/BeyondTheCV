import { useState, useRef, useEffect, useCallback } from 'react';
import { savePostureSession } from '../utils/postureStorage';

export function useVideoRecorder() {
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [activeVideoKey, setActiveVideoKey] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopVideo = useCallback((title?: string, summary?: string) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setVideoStream(null);
    setIsVideoRecording(false);
    if (title) {
      savePostureSession('video', title, summary || 'Réponse visio enregistrée');
    }
    setActiveVideoKey(null);
  }, []);

  const startVideo = useCallback(async (key: string = 'default') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setVideoStream(stream);
      setIsVideoRecording(true);
      setActiveVideoKey(key);
      return true;
    } catch (err) {
      console.error("Erreur d'accès à la caméra/micro :", err);
      alert("Impossible d'accéder à la caméra ou au micro. Veuillez vérifier les autorisations dans votre navigateur.");
      return false;
    }
  }, []);

  const toggleVideo = useCallback(async (key: string = 'default', title?: string, summary?: string) => {
    if (isVideoRecording && activeVideoKey === key) {
      stopVideo(title, summary);
      return false;
    } else {
      if (isVideoRecording) {
        stopVideo();
      }
      return await startVideo(key);
    }
  }, [isVideoRecording, activeVideoKey, startVideo, stopVideo]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    isVideoRecording,
    videoStream,
    activeVideoKey,
    startVideo,
    stopVideo,
    toggleVideo,
  };
}
