import React, { useEffect, useRef } from 'react';

interface VideoPreviewProps {
  stream: MediaStream | null;
  label?: string;
}

export function VideoPreview({ stream, label = "REC VISIO" }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <div style={{ 
      marginBottom: '1rem',
      borderRadius: '0.75rem', 
      overflow: 'hidden', 
      border: '2px solid #ef4444', 
      position: 'relative', 
      background: '#000', 
      animation: 'fadeIn 0.3s ease-out' 
    }}>
      {/* Le conteneur vidéo est maintenant séparé pour appliquer la transformation uniquement à la vidéo */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ 
          width: '100%', 
          maxHeight: '220px', 
          objectFit: 'contain', // 'contain' préserve le ratio sans couper l'image
          transform: 'scaleX(-1)', 
          display: 'block' 
        }}
      />
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        background: 'rgba(239, 68, 68, 0.9)', 
        color: 'white', 
        padding: '0.35rem 0.75rem', 
        borderRadius: '999px', 
        fontSize: '0.75rem', 
        fontWeight: 700, 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.4rem', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)' 
      }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white', animation: 'pulse 1s infinite' }} />
        {label}
      </div>
    </div>
  );
}
