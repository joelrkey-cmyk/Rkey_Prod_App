import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { Button } from '../ui/button';

const compressImage = (file, maxWidth = 1200, quality = 0.6) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = (maxWidth / w) * h;
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const compressFromCanvas = (canvas, quality = 0.6) => {
  return canvas.toDataURL('image/jpeg', quality);
};

/**
 * CameraStream: fullscreen camera overlay that stays open between shots.
 * Uses getUserMedia for continuous capture without closing.
 */
const CameraStream = ({ onCapture, onClose, currentCount, maxPhotos }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [sessionPhotos, setSessionPhotos] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setReady(true);
      } catch (err) {
        console.error('Camera error:', err);
        onClose();
      }
    };
    start();
    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, [onClose]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !ready) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = compressFromCanvas(canvas, 0.6);
    setSessionPhotos(prev => [...prev, dataUrl]);
    onCapture(dataUrl);
  }, [ready, onCapture]);

  const totalPhotos = currentCount + sessionPhotos.length;

  const handleDone = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-testid="camera-stream">
      {/* Camera feed */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Session photo thumbnails overlay */}
        {sessionPhotos.length > 0 && (
          <div className="absolute bottom-2 left-2 right-16 flex gap-1.5 overflow-x-auto py-1">
            {sessionPhotos.map((p, i) => (
              <img
                key={i}
                src={p}
                alt={`Capture ${i + 1}`}
                className="w-12 h-12 rounded-md object-cover border-2 border-white/80 flex-shrink-0"
              />
            ))}
          </div>
        )}
        {/* Photo counter */}
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
          {totalPhotos} / {maxPhotos}
        </div>
      </div>

      {/* Controls bar */}
      <div className="bg-black/90 px-4 py-4 flex items-center justify-between safe-area-bottom">
        <Button
          onClick={handleDone}
          variant="ghost"
          className="text-white border border-white/30 px-4 h-10"
          data-testid="camera-done-btn"
        >
          <Check className="w-4 h-4 mr-1.5" /> Terminer ({sessionPhotos.length})
        </Button>

        <button
          onClick={takePhoto}
          disabled={totalPhotos >= maxPhotos}
          className="w-16 h-16 rounded-full border-4 border-white bg-white/20 active:bg-white/50 transition-colors disabled:opacity-30"
          data-testid="camera-shutter-btn"
        />

        <div className="w-24" /> {/* spacer */}
      </div>
    </div>
  );
};

export const PhotoCapture = ({ photos = [], onAdd, onRemove, label = "Photos", maxPhotos = 50 }) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const fallbackRef = useRef(null);

  const handleCameraCapture = useCallback((dataUrl) => {
    onAdd(dataUrl);
  }, [onAdd]);

  // Fallback for devices where getUserMedia isn't available
  const handleFallbackCapture = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (photos.length >= maxPhotos) break;
      const compressed = await compressImage(file);
      onAdd(compressed);
    }
    e.target.value = '';
  };

  const openCamera = async () => {
    // Check if getUserMedia is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        // Quick permission check
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        setCameraOpen(true);
        return;
      } catch (e) {
        // getUserMedia failed, fallback to input
      }
    }
    // Fallback: use file input with capture
    fallbackRef.current?.click();
  };

  return (
    <div className="space-y-3" data-testid="photo-capture">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <span className="text-xs text-slate-400">{photos.length} photo{photos.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, idx) => (
          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
            <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(idx)}
              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
              data-testid={`remove-photo-${idx}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            onClick={openCamera}
            className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-slate-400 hover:text-slate-500 transition-colors"
            data-testid="add-photo-btn"
          >
            <Camera className="w-6 h-6" />
            <span className="text-[10px]">Photo</span>
          </button>
        )}
      </div>

      {/* Fallback file input for devices without getUserMedia */}
      <input
        ref={fallbackRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFallbackCapture}
        className="hidden"
      />

      {photos.length === 0 ? (
        <Button
          onClick={openCamera}
          variant="outline"
          className="w-full h-12 text-sm border-dashed"
          data-testid="take-photo-btn"
        >
          <Camera className="w-4 h-4 mr-2" /> Prendre des photos
        </Button>
      ) : photos.length < maxPhotos ? (
        <Button
          onClick={openCamera}
          variant="outline"
          size="sm"
          className="w-full text-xs"
        >
          <Camera className="w-3 h-3 mr-1" /> Prendre d'autres photos
        </Button>
      ) : null}

      {/* Camera stream overlay */}
      {cameraOpen && (
        <CameraStream
          onCapture={handleCameraCapture}
          onClose={() => setCameraOpen(false)}
          currentCount={photos.length}
          maxPhotos={maxPhotos}
        />
      )}
    </div>
  );
};

export const IdentityCapture = ({ recto, verso, onRectoChange, onVersoChange }) => {
  const rectoRef = useRef(null);
  const versoRef = useRef(null);

  const handleFile = async (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImage(file, 1400, 0.7);
    setter(compressed);
    e.target.value = '';
  };

  return (
    <div className="space-y-4" data-testid="identity-capture">
      <p className="text-sm font-medium text-slate-700">Pièce d'identité</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Recto */}
        <div>
          <p className="text-xs text-slate-500 mb-1.5 text-center">Recto</p>
          {recto ? (
            <div className="relative aspect-[3/2] rounded-lg overflow-hidden border border-slate-200">
              <img src={recto} alt="ID Recto" className="w-full h-full object-cover" />
              <button
                onClick={() => onRectoChange(null)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                data-testid="remove-id-recto"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => rectoRef.current?.click()}
              className="w-full aspect-[3/2] rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400"
              data-testid="capture-id-recto"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px]">Recto</span>
            </button>
          )}
          <input ref={rectoRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e, onRectoChange)} className="hidden" />
        </div>

        {/* Verso */}
        <div>
          <p className="text-xs text-slate-500 mb-1.5 text-center">Verso</p>
          {verso ? (
            <div className="relative aspect-[3/2] rounded-lg overflow-hidden border border-slate-200">
              <img src={verso} alt="ID Verso" className="w-full h-full object-cover" />
              <button
                onClick={() => onVersoChange(null)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                data-testid="remove-id-verso"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => versoRef.current?.click()}
              className="w-full aspect-[3/2] rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400"
              data-testid="capture-id-verso"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px]">Verso</span>
            </button>
          )}
          <input ref={versoRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e, onVersoChange)} className="hidden" />
        </div>
      </div>
    </div>
  );
};
