import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, AlertCircle, Upload } from 'lucide-react';

interface QrScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ onDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [usingBarcodeDetector, setUsingBarcodeDetector] = useState(false);

  // Extract 6-character room code from text or URL
  const extractCode = (text: string): string | null => {
    const trimmed = text.trim();
    // Check if URL ends with 6-char code
    const urlMatch = trimmed.match(/\/room\/([A-Za-z0-9]{6})/i);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1].toUpperCase();
    }
    // Check if raw 6-character code
    const rawMatch = trimmed.match(/^[A-Za-z0-9]{6}$/);
    if (rawMatch) {
      return trimmed.toUpperCase();
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    let detector: any = null;

    // Check BarcodeDetector API support
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
        setUsingBarcodeDetector(true);
      } catch {
        detector = null;
      }
    }

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported by your browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });

        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        startScanningLoop(detector);
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        if (isMounted) {
          setCameraError(err.message || 'Unable to access camera. Please allow permissions.');
        }
      }
    };

    const startScanningLoop = (nativeDetector: any) => {
      const scan = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animFrameRef.current = requestAnimationFrame(scan);
          return;
        }

        // Try BarcodeDetector if available
        if (nativeDetector) {
          try {
            const barcodes = await nativeDetector.detect(video);
            if (barcodes.length > 0) {
              const code = extractCode(barcodes[0].rawValue);
              if (code) {
                onDetected(code);
                return;
              }
            }
          } catch {
            // Fallback to jsQR canvas scanning
          }
        }

        // jsQR fallback
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (qrResult && qrResult.data) {
              const code = extractCode(qrResult.data);
              if (code) {
                onDetected(code);
                return;
              }
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(scan);
      };

      animFrameRef.current = requestAnimationFrame(scan);
    };

    startCamera();

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [onDetected]);

  // Support scanning QR from an uploaded photo or screenshot
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imgData.data, imgData.width, imgData.height);
          if (result && result.data) {
            const code = extractCode(result.data);
            if (code) {
              onDetected(code);
              return;
            }
          }
          alert('Could not detect a valid Kick & Crease QR code in that image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 12, 8, 0.92)',
        backdropFilter: 'blur(8px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-scoreboard)',
          maxWidth: '440px',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={20} color="var(--accent-floodlight)" />
            <h2 id="qr-scanner-title" style={{ fontSize: '1.3rem' }}>
              Scan Match QR Code
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close scanner"
            style={{
              padding: '0.4rem',
              color: 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div
          style={{
            position: 'relative',
            height: '290px',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Scanner Reticle Overlay */}
          <div
            style={{
              position: 'absolute',
              width: '200px',
              height: '200px',
              border: '2px solid var(--accent-floodlight)',
              borderRadius: '16px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            {/* Corner highlights */}
            <div
              style={{
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                width: '24px',
                height: '24px',
                borderTop: '4px solid var(--accent-floodlight)',
                borderLeft: '4px solid var(--accent-floodlight)',
                borderRadius: '8px 0 0 0',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '24px',
                height: '24px',
                borderTop: '4px solid var(--accent-floodlight)',
                borderRight: '4px solid var(--accent-floodlight)',
                borderRadius: '0 8px 0 0',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-2px',
                left: '-2px',
                width: '24px',
                height: '24px',
                borderBottom: '4px solid var(--accent-floodlight)',
                borderLeft: '4px solid var(--accent-floodlight)',
                borderRadius: '0 0 0 8px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '24px',
                height: '24px',
                borderBottom: '4px solid var(--accent-floodlight)',
                borderRight: '4px solid var(--accent-floodlight)',
                borderRadius: '0 0 8px 0',
              }}
            />
          </div>

          {cameraError && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(15, 26, 20, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1.5rem',
                textAlign: 'center',
                gap: '0.75rem',
              }}
            >
              <AlertCircle size={36} color="var(--status-live)" />
              <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {cameraError}
              </p>
              <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                Upload QR Screenshot
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div
          style={{
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {usingBarcodeDetector ? 'Hardware BarcodeDetector Active' : 'jsQR Fallback Engine Active'}
          </div>
          <label
            className="btn btn-outline btn-sm"
            style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
          >
            <Upload size={14} />
            Photo Upload
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
