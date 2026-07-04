import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Trash2, Check, Loader2, RefreshCw } from 'lucide-react';

const CameraCaptureModal = ({ isOpen, onClose, onPhotosSaved, BACKEND_URL }) => {
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [photos, setPhotos] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    let activeStream = null;

    const startCamera = async () => {
      setError(null);
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
          video: selectedDeviceId 
            ? { deviceId: { exact: selectedDeviceId } } 
            : { facingMode: { ideal: 'environment' } }
        };
        
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }

        // Enumerate devices to allow switching between cameras
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        
        if (videoDevices.length > 0 && !selectedDeviceId) {
          const videoTrack = s.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            if (settings.deviceId) {
              setSelectedDeviceId(settings.deviceId);
            }
          }
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setError("Impossible d'accéder à l'appareil photo. Veuillez vérifier les autorisations d'accès à la caméra.");
      }
    };

    if (isOpen) {
      startCamera();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, selectedDeviceId]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Use natural video dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    
    // If front camera, mirror the image horizontally for natural look
    const isFrontCamera = devices.find(d => d.deviceId === selectedDeviceId)?.label?.toLowerCase().includes('front') || false;
    if (isFrontCamera) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotos(prev => [...prev, {
        id: Date.now(),
        dataUrl,
        blob
      }]);
    }, 'image/jpeg', 0.85);
  };

  const deletePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    if (photos.length === 0) return;
    setIsUploading(true);
    const uploaded = [];
    try {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const formData = new FormData();
        const file = new File([photo.blob], `camera_${Date.now()}_${i}.jpg`, { type: 'image/jpeg' });
        formData.append('file', file);
        
        const response = await fetch(`${BACKEND_URL}/api/public/upload/photo`, {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            uploaded.push({ url: data.url, id: Date.now() + i });
          }
        }
      }
      
      if (uploaded.length > 0) {
        await onPhotosSaved(uploaded);
        onClose();
      } else {
        alert("Erreur lors de l'envoi des photos.");
      }
    } catch (err) {
      console.error("Error saving camera photos:", err);
      alert("Erreur de connexion lors de l'envoi.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4" onClick={onClose}>
      <div 
        className="bg-slate-950 text-slate-100 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-800 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h3 className="text-lg font-bold">Appareil Photo en direct</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 min-h-0 bg-[#0c0d16]">
          {/* Left Column: Live Video */}
          <div className="flex-1 flex flex-col justify-between items-center bg-black/40 rounded-xl p-4 border border-slate-800">
            {error ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <p className="text-red-400 font-semibold mb-2">Erreur d'accès à l'appareil</p>
                <p className="text-sm max-w-md">{error}</p>
              </div>
            ) : (
              <div className="relative w-full aspect-video md:max-h-[45vh] bg-black rounded-lg overflow-hidden flex items-center justify-center border border-slate-900 shadow-inner">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                  style={{
                    transform: devices.find(d => d.deviceId === selectedDeviceId)?.label?.toLowerCase().includes('front') ? 'scaleX(-1)' : 'none'
                  }}
                />
              </div>
            )}

            {/* Camera Controls */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
              {/* Device Selector */}
              {devices.length > 1 ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <RefreshCw className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-48 cursor-pointer"
                  >
                    {devices.map((device, idx) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Caméra ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div />
              )}

              {/* Take Photo Button */}
              {!error && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-full flex items-center gap-2 shadow-lg transition active:scale-95 duration-150 text-sm"
                >
                  <Camera className="w-5 h-5" />
                  Prendre une photo
                </button>
              )}
              <div />
            </div>
          </div>

          {/* Right Column: Captured Session Photos Preview */}
          <div className="w-full md:w-80 flex flex-col border border-slate-800 rounded-xl p-4 bg-slate-900/50 min-h-[150px] md:min-h-0">
            <h4 className="font-bold text-sm text-slate-300 mb-3 flex items-center justify-between">
              <span>Photos prises ({photos.length})</span>
              {photos.length > 0 && (
                <button 
                  onClick={() => setPhotos([])} 
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Tout effacer
                </button>
              )}
            </h4>

            {/* Grid of session photos */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {photos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-800 rounded-lg">
                  <Camera className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500">Aucune photo capturée pour le moment.</p>
                  <p className="text-[10px] text-slate-600 mt-1">Cliquez sur "Prendre une photo" à gauche.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 gap-2.5">
                  {photos.map(p => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-800 group bg-black">
                      <img src={p.dataUrl} alt="Captured preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => deletePhoto(p.id)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white p-1 rounded-full transition shadow-md"
                        title="Supprimer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validate and save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={photos.length === 0 || isUploading}
              className={`w-full mt-4 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition duration-200 ${
                photos.length === 0 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Valider et Importer ({photos.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;
