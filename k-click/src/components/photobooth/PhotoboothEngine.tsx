import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PHOTOBOOTH_TEMPLATES } from '../../data/mockTemplates';
import { productToPhotoboothTemplate, isPhotoboothFrameProduct, MARKETPLACE_FRAME_PRODUCTS, getProductFallbackImage } from '../../data/mockProducts';
import { PhotoboothTemplate, PhotoCapture, GalleryItem, AspectRatioType, Product } from '../../types';
import {
  generateTransparentFramePng,
  getFrameLayout,
  FrameLayoutInfo,
  drawRoundRect,
  clampPhotoPan,
  calculatePhotoTransform,
} from '../../utils/frameGenerator';
import { uploadFileToCloud } from '../../services/firebase';
import { CheckoutModal } from '../marketplace/CheckoutModal';
import { CustomTemplateModal } from '../templates/CustomTemplateModal';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  Upload, 
  RefreshCw, 
  Download, 
  Heart, 
  RotateCw, 
  RotateCcw,
  ZoomIn, 
  ZoomOut, 
  ArrowLeft, 
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Move,
  Check, 
  Sliders, 
  Layers, 
  Palette,
  Share2,
  Lock,
  ChevronRight,
  FlipHorizontal,
  Image as ImageIcon,
  Square,
  FileCheck,
  ShoppingBag,
  CheckCircle2,
  Eye,
  EyeOff,
  Columns,
  Maximize2,
  Clock,
  Plus,
  Flame
} from 'lucide-react';

type Step = 'config' | 'camera' | 'editor' | 'decorate' | 'result';
type CameraPreviewMode = 'split' | 'composite' | 'camera';

const LiveVideoSlot: React.FC<{
  stream: MediaStream | null;
  mirrored: boolean;
  className?: string;
}> = ({ stream, mirrored, className = '' }) => {
  const slotVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = slotVideoRef.current;
    if (!el) return;
    if (stream && el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else if (!stream) {
      el.srcObject = null;
    }
  }, [stream]);

  return (
    <video
      ref={slotVideoRef}
      autoPlay
      playsInline
      muted
      className={`w-full h-full object-cover pointer-events-none select-none ${
        mirrored ? 'scale-x-[-1]' : ''
      } ${className}`}
    />
  );
};

export const PhotoboothEngine: React.FC = () => {
  const {
    user,
    products,
    addToGallery,
    showToast,
    setActiveTab,
    selectedPhotoboothTemplate,
    setSelectedPhotoboothTemplate,
    hasPurchasedProduct,
    isProductPendingVerification,
    setIsAuthModalOpen,
    userCustomTemplates,
  } = useApp();

  // Step state
  const [step, setStep] = useState<Step>('config');
  const [checkoutFrameProduct, setCheckoutFrameProduct] = useState<Product | null>(null);
  const [isCustomTemplateModalOpen, setIsCustomTemplateModalOpen] = useState<boolean>(false);

  // Aspect Ratio & Layout
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('strip');
  const [photoCount, setPhotoCount] = useState<number>(4);
  const [selectedTemplate, setSelectedTemplate] = useState<PhotoboothTemplate>(selectedPhotoboothTemplate || PHOTOBOOTH_TEMPLATES[0]);
  const [customFrameUrl, setCustomFrameUrl] = useState<string | null>(null);
  const [customFrameRatioMismatch, setCustomFrameRatioMismatch] = useState<boolean>(false);
  const [generatedFramePng, setGeneratedFramePng] = useState<string | null>(null);

  // Combine catalog frame products with official 20k/15k marketplace frame templates
  const marketplaceFrameProducts = useMemo(() => {
    const map = new Map<string, Product>();
    MARKETPLACE_FRAME_PRODUCTS.forEach((p) => map.set(p.id, p));
    products.filter((p) => isPhotoboothFrameProduct(p)).forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [products]);

  // Purchased marketplace frame templates owned by current user
  const purchasedFrameProducts = useMemo(() => {
    return marketplaceFrameProducts.filter((p) => p.price === 0 || hasPurchasedProduct(p.id));
  }, [marketplaceFrameProducts, hasPurchasedProduct]);

  // Template Previewer states (real-time overlay on live camera stream)
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [showLiveTemplateOverlay, setShowLiveTemplateOverlay] = useState<boolean>(true);
  const [cameraPreviewMode, setCameraPreviewMode] = useState<CameraPreviewMode>('split');
  const [livePreviewAllSlots, setLivePreviewAllSlots] = useState<boolean>(true);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(100);
  const [previewerTab, setPreviewerTab] = useState<'purchased' | 'marketplace' | 'free'>('purchased');
  const [previewingUnownedProduct, setPreviewingUnownedProduct] = useState<Product | null>(null);

  // Clear unowned preview lock once user purchases that product
  useEffect(() => {
    if (previewingUnownedProduct && hasPurchasedProduct(previewingUnownedProduct.id)) {
      setPreviewingUnownedProduct(null);
    }
  }, [previewingUnownedProduct, hasPurchasedProduct]);

  // Synchronize template if selected from Marketplace, Gallery, Templates, or Home view
  useEffect(() => {
    if (selectedPhotoboothTemplate) {
      setSelectedTemplate(selectedPhotoboothTemplate);
      setCustomBorderColor(selectedPhotoboothTemplate.themeColor);
      if (selectedPhotoboothTemplate.bannerText) {
        setCustomCaption(selectedPhotoboothTemplate.bannerText);
      }
      if (selectedPhotoboothTemplate.stickers && selectedPhotoboothTemplate.stickers.length > 0) {
        setSelectedStickers(selectedPhotoboothTemplate.stickers.map((s) => s.icon));
      }
      if (selectedPhotoboothTemplate.frameOverlayUrl) {
        setCustomFrameUrl(selectedPhotoboothTemplate.frameOverlayUrl);
      } else {
        setCustomFrameUrl(null);
      }
      if (selectedPhotoboothTemplate.aspectRatio) {
        setAspectRatio(selectedPhotoboothTemplate.aspectRatio);
      }
      setCustomFrameRatioMismatch(false);
      setPreviewingUnownedProduct(null);
    }
  }, [selectedPhotoboothTemplate]);

  const applyTemplateFromProduct = (product: Product, isTrialPreview = false) => {
    const tmpl = productToPhotoboothTemplate(product);
    setSelectedTemplate(tmpl);
    if (!isTrialPreview) {
      setSelectedPhotoboothTemplate(tmpl);
      setPreviewingUnownedProduct(null);
    } else {
      setPreviewingUnownedProduct(product);
    }
    setCustomBorderColor(tmpl.themeColor);
    setCustomCaption(tmpl.bannerText);
    if (tmpl.stickers.length > 0) {
      setSelectedStickers(tmpl.stickers.map((s) => s.icon));
    }
    setCustomFrameUrl(null);
    setCustomFrameRatioMismatch(false);
  };

  const handleSelectMarketplaceFrame = (product: Product) => {
    const isOwned = product.price === 0 || hasPurchasedProduct(product.id);
    if (!isOwned) {
      if (!user) {
        showToast('Silakan login terlebih dahulu untuk membeli Frame Template ini', 'info');
        setIsAuthModalOpen(true);
        return;
      }
      if (isProductPendingVerification(product.id)) {
        showToast(
          `Pembayaran frame "${product.name}" sedang menunggu verifikasi Tim Admin K-Click.`,
          'info'
        );
        setActiveTab('gallery');
        return;
      }
      setCheckoutFrameProduct(product);
      return;
    }

    applyTemplateFromProduct(product, false);
    showToast(`Frame "${product.name}" berhasil diterapkan!`, 'success');
  };

  const handleLivePreviewFrameInCamera = (product: Product) => {
    const isOwned = product.price === 0 || hasPurchasedProduct(product.id);
    applyTemplateFromProduct(product, !isOwned);
    setShowLiveTemplateOverlay(true);
    setStep('camera');
    showToast(
      isOwned
        ? `Memuat "${product.name}" pada Live Template Previewer!`
        : `Mode Live Preview: Mencoba frame "${product.name}" di kamera live`,
      'info'
    );
  };

  // Captures
  const [captures, setCaptures] = useState<PhotoCapture[]>([]);
  const [currentCaptureIdx, setCurrentCaptureIdx] = useState<number>(0);

  // Camera handling
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);

  // Active editor item & slot placement
  const [activeEditIndex, setActiveEditIndex] = useState<number>(0);
  const [retakingSlotIdx, setRetakingSlotIdx] = useState<number | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewWidth, setPreviewWidth] = useState<number>(320);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Measure preview viewport width accurately
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const updateSize = () => {
      if (el.clientWidth > 0) {
        setPreviewWidth(el.clientWidth);
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [step, aspectRatio, photoCount]);

  // Customization & Decoration
  const [customBorderColor, setCustomBorderColor] = useState<string>(selectedTemplate.themeColor);
  const [customCaption, setCustomCaption] = useState<string>('FOREVER MEMORIES • 영원히');
  const [selectedStickers, setSelectedStickers] = useState<string[]>(['💖', '🎀', '📸']);
  const [aiCaptionsLoading, setAiCaptionsLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  
  // Export states
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Update photo count automatically when aspect ratio changes if needed
  const handleAspectRatioChange = (ratio: AspectRatioType) => {
    setAspectRatio(ratio);
    if (ratio === 'strip') {
      setPhotoCount(4);
    } else {
      setPhotoCount(1); // Default single photocard / twibbon
    }
  };

  // Generate transparent frame overlay whenever template, ratio, count, or color changes
  useEffect(() => {
    let isMounted = true;
    if (customFrameUrl) {
      setGeneratedFramePng(customFrameUrl);
      return;
    }

    generateTransparentFramePng(selectedTemplate, aspectRatio, photoCount, customBorderColor)
      .then((dataUrl) => {
        if (isMounted) {
          setGeneratedFramePng(dataUrl);
        }
      })
      .catch((err) => console.error('Frame generation error:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedTemplate, aspectRatio, photoCount, customBorderColor, customFrameUrl]);

  // Initialize camera
  const startCamera = async (facing: 'user' | 'environment' = cameraFacing) => {
    try {
      setIsVideoReady(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      setActiveStream(stream);
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play().catch(() => {});
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          setIsVideoReady(true);
        }
      }
      setHasCameraPermission(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setIsVideoReady(false);
      setActiveStream(null);
      setHasCameraPermission(false);
    }
  };

  const stopCamera = () => {
    setIsVideoReady(false);
    setActiveStream(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (step === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [step, cameraFacing]);

  // Flip Camera
  const toggleCameraFacing = () => {
    const next = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(next);
    startCamera(next);
  };

  // Capture Photo with Countdown
  const triggerCountdownAndCapture = () => {
    if (countdown !== null) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      showToast('Kamera sedang memuat frame video, tunggu sebentar...', 'info');
      return;
    }
    let count = 3;
    setCountdown(count);

    const timer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(timer);
        setCountdown(null);
        takeSnapshot();
      }
    }, 900);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      showToast('Kamera belum siap menghasilkan frame', 'error');
      return;
    }
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Mirror if front camera
    if (cameraFacing === 'user') {
      ctx.translate(tempCanvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);

    // Flash animation effect
    setIsFlashActive(true);
    setTimeout(() => setIsFlashActive(false), 200);

    const newCapture: PhotoCapture = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rawImage: dataUrl,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      isFlipped: false,
    };

    if (retakingSlotIdx !== null) {
      const slotNum = retakingSlotIdx + 1;
      setCaptures((prev) => {
        const next = [...prev];
        next[retakingSlotIdx] = newCapture;
        return next;
      });
      setRetakingSlotIdx(null);
      showToast(`Foto Slot #${slotNum} berhasil diperbarui!`, 'success');
      setTimeout(() => {
        setStep('editor');
      }, 400);
      return;
    }

    const updated = [...captures, newCapture].slice(0, photoCount);
    setCaptures(updated);

    if (updated.length >= photoCount) {
      setTimeout(() => {
        setStep('editor');
      }, 500);
    } else {
      setCurrentCaptureIdx(updated.length);
    }
  };

  // Validate and decode uploaded image file (JPEG, PNG, WebP, max 15MB, valid dimensions)
  const validateAndReadImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        reject(new Error('Format file harus JPEG, PNG, atau WebP'));
        return;
      }
      const maxSizeBytes = 15 * 1024 * 1024; // 15 MB
      if (file.size > maxSizeBytes) {
        reject(new Error('Ukuran foto maksimal 15MB'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Upload gagal: File tidak dapat dibaca'));
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!dataUrl) {
          reject(new Error('Upload gagal: Data gambar kosong'));
          return;
        }
        const img = new Image();
        img.onload = () => {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            resolve(dataUrl);
          } else {
            reject(new Error('Upload gagal: Resolusi gambar tidak valid'));
          }
        };
        img.onerror = () => reject(new Error('Upload gagal: File bukan gambar yang valid'));
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload photo alternative
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = Math.max(0, photoCount - captures.length);
    if (remaining === 0) {
      showToast('Semua slot foto sudah terisi!', 'info');
      e.target.value = '';
      return;
    }

    const toProcess = (Array.from(files) as File[]).slice(0, remaining);
    const validCaptures: PhotoCapture[] = [];

    for (const file of toProcess) {
      try {
        const dataUrl = await validateAndReadImageFile(file);
        validCaptures.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          rawImage: dataUrl,
          zoom: 1.0,
          panX: 0,
          panY: 0,
          rotation: 0,
          isFlipped: false,
        });
      } catch (err: any) {
        showToast(err?.message || 'Upload gagal: File gambar tidak valid', 'error');
      }
    }

    if (validCaptures.length > 0) {
      setCaptures((prev) => {
        const next = [...prev, ...validCaptures].slice(0, photoCount);
        if (next.length >= photoCount) {
          setTimeout(() => setStep('editor'), 300);
        }
        return next;
      });
      showToast(`${validCaptures.length} foto berhasil diunggah`, 'success');
    }

    e.target.value = '';
  };

  // Replace photo for active slot from file upload
  const handleReplaceActivePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await validateAndReadImageFile(file);
      const slotNum = activeEditIndex + 1;
      setCaptures((prev) => {
        const next = [...prev];
        next[activeEditIndex] = {
          id: `replace-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          rawImage: dataUrl,
          zoom: 1.0,
          panX: 0,
          panY: 0,
          rotation: 0,
          isFlipped: false,
        };
        return next;
      });
      showToast(`Foto Slot #${slotNum} berhasil diganti!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Upload gagal: File gambar tidak valid', 'error');
    }

    e.target.value = '';
  };

  // Retake photo for active slot from camera
  const handleRetakeActiveSlot = () => {
    setRetakingSlotIdx(activeEditIndex);
    setStep('camera');
  };

  // Upload Custom Transparent PNG Frame with aspect ratio validation
  const handleCustomFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await validateAndReadImageFile(file);
      const img = new Image();
      img.onload = () => {
        const layout = getFrameLayout(aspectRatio, photoCount);
        const frameRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = layout.width / layout.height;
        const diff = Math.abs(frameRatio - targetRatio) / targetRatio;

        setCustomFrameUrl(dataUrl);
        if (diff > 0.08) {
          setCustomFrameRatioMismatch(true);
          showToast(
            `Perhatian: Rasio frame (${img.naturalWidth}×${img.naturalHeight}) berbeda dari kanvas (${layout.width}×${layout.height}). Frame disesuaikan agar tidak melar.`,
            'info'
          );
        } else {
          setCustomFrameRatioMismatch(false);
          showToast('Frame transparan PNG kustom berhasil dipasang!', 'success');
        }
      };
      img.src = dataUrl;
    } catch (err: any) {
      showToast(err?.message || 'Upload frame gagal', 'error');
    }
    e.target.value = '';
  };

  // Helper to get active window dimensions for pan clamping
  const getActiveWindowBounds = () => {
    const layout = getFrameLayout(aspectRatio, photoCount);
    const win = layout.windows[activeEditIndex] || layout.windows[0];
    return { width: win?.width || layout.width, height: win?.height || layout.height };
  };

  // Interactive Editor Manipulations
  const updateCurrentPhoto = (updater: (prev: PhotoCapture) => PhotoCapture) => {
    setCaptures((prev) =>
      prev.map((c, idx) => (idx === activeEditIndex ? updater(c) : c))
    );
  };

  const handleZoomSlider = (newZoom: number) => {
    const { width, height } = getActiveWindowBounds();
    const z = Number(newZoom.toFixed(2));
    updateCurrentPhoto((p) => {
      const clamped = clampPhotoPan(p.panX, p.panY, z, width, height);
      return {
        ...p,
        zoom: z,
        panX: clamped.panX,
        panY: clamped.panY,
      };
    });
  };

  const handleZoomStep = (delta: number) => {
    const { width, height } = getActiveWindowBounds();
    updateCurrentPhoto((p) => {
      const z = Math.min(3.0, Math.max(0.5, Number((p.zoom + delta).toFixed(2))));
      const clamped = clampPhotoPan(p.panX, p.panY, z, width, height);
      return {
        ...p,
        zoom: z,
        panX: clamped.panX,
        panY: clamped.panY,
      };
    });
  };

  const handleRotateStep = (degrees: number) => {
    updateCurrentPhoto((p) => ({
      ...p,
      rotation: (p.rotation + degrees + 360) % 360,
    }));
  };

  const handleNudge = (dx: number, dy: number) => {
    const { width, height } = getActiveWindowBounds();
    updateCurrentPhoto((p) => {
      const clamped = clampPhotoPan(p.panX + dx, p.panY + dy, p.zoom, width, height);
      return {
        ...p,
        panX: clamped.panX,
        panY: clamped.panY,
      };
    });
  };

  const handleFlipHorizontal = () => {
    updateCurrentPhoto((p) => ({
      ...p,
      isFlipped: !p.isFlipped,
    }));
  };

  const handleResetCurrent = () => {
    updateCurrentPhoto((p) => ({
      ...p,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      isFlipped: false,
    }));
    showToast(`Posisi Slot #${activeEditIndex + 1} telah direset`, 'info');
  };

  // Drag handlers with accurate coordinate scaling & clamping
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const layout = getFrameLayout(aspectRatio, photoCount);
    const scale = previewWidth > 0 ? layout.width / previewWidth : 4;
    const win = layout.windows[activeEditIndex] || layout.windows[0];

    updateCurrentPhoto((p) => {
      const clamped = clampPhotoPan(
        p.panX + dx * scale,
        p.panY + dy * scale,
        p.zoom,
        win?.width || layout.width,
        win?.height || layout.height
      );
      return {
        ...p,
        panX: clamped.panX,
        panY: clamped.panY,
      };
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch drag handlers with accurate coordinate scaling & clamping
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });

    const layout = getFrameLayout(aspectRatio, photoCount);
    const scale = previewWidth > 0 ? layout.width / previewWidth : 4;
    const win = layout.windows[activeEditIndex] || layout.windows[0];

    updateCurrentPhoto((p) => {
      const clamped = clampPhotoPan(
        p.panX + dx * scale,
        p.panY + dy * scale,
        p.zoom,
        win?.width || layout.width,
        win?.height || layout.height
      );
      return {
        ...p,
        panX: clamped.panX,
        panY: clamped.panY,
      };
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // AI Caption Generator
  const fetchAiCaptions = async () => {
    try {
      setAiCaptionsLoading(true);
      const captionRes = await fetch('/api/gemini/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: selectedTemplate.category,
          theme: selectedTemplate.name,
        }),
      });
      if (captionRes.status === 429) {
        const errorData = await captionRes.json().catch(() => ({}));
        showToast(errorData.message || 'Batas penggunaan Smart Caption tercapai. Harap tunggu sebentar.', 'error');
        return;
      }
      const data = await captionRes.json();
      if (data.captions && data.captions.length > 0) {
        setAiSuggestions(data.captions);
        setCustomCaption(data.captions[0]);
        showToast('Smart Caption estetik berhasil dibuat!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Menggunakan rekomendasi caption bawaan', 'info');
    } finally {
      setAiCaptionsLoading(false);
    }
  };

  // HIGH-RESOLUTION CANVAS COMPOSITE GENERATOR
  // Renders 6 distinct layers:
  // Layer 1: Solid/Gradient Background
  // Layer 2: User Photos (clipped in windows with pan, zoom, rotation, flip)
  // Layer 3: Additional Props / Accents
  // Layer 4: Stickers
  // Layer 5: Frame PNG (Transparent overlay)
  // Layer 6: Text & Metadata
  const generateHighResComposite = useCallback(async () => {
    if (previewingUnownedProduct && !hasPurchasedProduct(previewingUnownedProduct.id)) {
      showToast(
        `Silakan beli & unlock frame "${previewingUnownedProduct.name}" terlebih dahulu untuk merender hasil akhir`,
        'info'
      );
      if (!user) {
        setIsAuthModalOpen(true);
      } else {
        setCheckoutFrameProduct(previewingUnownedProduct);
      }
      return;
    }

    setIsGenerating(true);
    try {
      const layout: FrameLayoutInfo = getFrameLayout(aspectRatio, photoCount, 1600);
      const canvas = document.createElement('canvas');
      canvas.width = layout.width;
      canvas.height = layout.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Enable maximum image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // LAYER 1: Background
      ctx.fillStyle = customBorderColor || selectedTemplate.themeColor;
      ctx.fillRect(0, 0, layout.width, layout.height);

      // LAYER 2: User Photos in each window
      for (let i = 0; i < layout.windows.length; i++) {
        const win = layout.windows[i];
        const capture = captures[i];
        if (!capture) continue;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = capture.rawImage;
        });

        ctx.save();
        // Clip to window bounds
        ctx.beginPath();
        drawRoundRect(ctx, win.x, win.y, win.width, win.height, win.borderRadius);
        ctx.clip();

        // Unified transform matrix shared with Live Preview via calculatePhotoTransform()
        const tf = calculatePhotoTransform(capture, win, 1);
        const centerX = win.x + win.width / 2 + tf.clampedPanX;
        const centerY = win.y + win.height / 2 + tf.clampedPanY;
        ctx.translate(centerX, centerY);
        ctx.rotate(tf.rotationRad);
        ctx.scale(tf.scaleX, tf.scaleY);

        // Maintain aspect ratio cover inside base window dimensions
        const imgAspect = img.width / img.height;
        const winAspect = win.width / win.height;
        let baseW = win.width;
        let baseH = win.height;

        if (imgAspect > winAspect) {
          baseH = win.height;
          baseW = win.height * imgAspect;
        } else {
          baseW = win.width;
          baseH = win.width / imgAspect;
        }

        ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
        ctx.restore();
      }

      // LAYER 3 & 4: Additional Props & Stickers
      ctx.save();
      ctx.font = '54px sans-serif';
      selectedTemplate.stickers.forEach((st) => {
        const sx = (st.x / 100) * layout.width;
        const sy = (st.y / 100) * layout.height;
        ctx.fillText(st.icon, sx, sy);
      });
      ctx.restore();

      // LAYER 5: Frame PNG Overlay (preserve aspect ratio if custom frame ratio differs)
      if (generatedFramePng) {
        const frameImg = new Image();
        frameImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          frameImg.onload = () => resolve();
          frameImg.onerror = () => resolve();
          frameImg.src = generatedFramePng;
        });
        if (customFrameUrl && customFrameRatioMismatch && frameImg.naturalWidth > 0 && frameImg.naturalHeight > 0) {
          const fRatio = frameImg.naturalWidth / frameImg.naturalHeight;
          const cRatio = layout.width / layout.height;
          let drawW = layout.width;
          let drawH = layout.height;
          if (fRatio > cRatio) {
            drawH = layout.width / fRatio;
          } else {
            drawW = layout.height * fRatio;
          }
          ctx.drawImage(frameImg, (layout.width - drawW) / 2, (layout.height - drawH) / 2, drawW, drawH);
        } else {
          ctx.drawImage(frameImg, 0, 0, layout.width, layout.height);
        }
      }

      // LAYER 6: Text, Custom Slogan, & Metadata Stamp
      ctx.save();
      const footerY = layout.height - 180;
      ctx.fillStyle = selectedTemplate.textColor;
      ctx.textAlign = 'center';

      // Slogan
      ctx.font = 'bold 26px "Outfit", sans-serif';
      ctx.fillText(customCaption, layout.width / 2, footerY + 30);

      // Timestamp
      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} • K-CLICK`;
      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = selectedTemplate.textColor + 'aa';
      ctx.fillText(dateStr, layout.width / 2, footerY + 65);

      // Stickers row
      const stickersStr = selectedStickers.join('   ');
      ctx.font = '32px sans-serif';
      ctx.fillText(stickersStr, layout.width / 2, footerY + 115);
      ctx.restore();

      // Output based on selected format
      let mimeType = 'image/png';
      let quality = 0.95;
      if (exportFormat === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (exportFormat === 'webp') {
        mimeType = 'image/webp';
      }

      const resultDataUrl = canvas.toDataURL(mimeType, quality);
      setFinalImageUrl(resultDataUrl);
      setStep('result');

      // Confetti celebration
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#ec4899', '#8b5cf6', '#38bdf8', '#f59e0b'],
        });
      } catch {
        // safe ignore
      }
    } catch (err) {
      console.error('Composite render failed:', err);
      showToast('Gagal merender photobooth high-res', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [aspectRatio, captures, customBorderColor, customCaption, exportFormat, generatedFramePng, photoCount, selectedStickers, selectedTemplate, showToast]);

  // Save to Gallery (converts Data URL to Blob & uploads to Firebase Storage when authenticated)
  const handleSaveToGallery = async () => {
    if (!finalImageUrl) return;

    const itemId = `kclick-${Date.now()}`;
    let storedUrl = finalImageUrl;

    if (user?.id) {
      try {
        const res = await fetch(finalImageUrl);
        const blob = await res.blob();
        const ext = exportFormat === 'jpeg' ? 'jpg' : exportFormat;
        const file = new File([blob], `${itemId}.${ext}`, { type: blob.type || `image/${exportFormat}` });
        storedUrl = await uploadFileToCloud(file, `gallery/${user.id}/${itemId}.${ext}`);
      } catch {
        storedUrl = finalImageUrl;
      }
    }

    const newItem: GalleryItem = {
      id: itemId,
      userId: user?.id || 'guest',
      title: `${selectedTemplate.name} (${aspectRatio.toUpperCase()})`,
      type: 'photobooth',
      fileUrl: storedUrl,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      createdAt: new Date().toISOString(),
      meta: {
        photosCount: photoCount,
        frameColor: customBorderColor,
        caption: customCaption,
      },
    };

    addToGallery(newItem);
  };

  // Direct Download
  const handleDownload = () => {
    if (!finalImageUrl) return;
    const a = document.createElement('a');
    a.href = finalImageUrl;
    a.download = `K-Click-${selectedTemplate.id}-${aspectRatio}-${Date.now()}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Photo strip berhasil didownload (${exportFormat.toUpperCase()} High Resolution)!`, 'success');
  };

  const currentLayout: FrameLayoutInfo = getFrameLayout(aspectRatio, photoCount);
  const currentCapture = captures[activeEditIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-24 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-xs font-bold mb-2">
            <Camera className="w-3.5 h-3.5" />
            <span>Live Photobooth & Twibbon Studio</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
            Create Your Aesthetic Photo Strip
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pilih rasio (Strip, 2:3 Photocard, 3:4, 4:5, 9:16), ambil/upload foto, atur frame Twibbon presisi!
          </p>
        </div>

        {/* Step Navigation Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setStep('config')}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              step === 'config' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500'
            }`}
          >
            1. Format & Frame
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <button
            onClick={() => setStep('camera')}
            className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer ${
              step === 'camera' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-pink-600" />
            <span>2. Live Camera & Previewer ({captures.length}/{photoCount})</span>
          </button>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <button
            onClick={() => {
              if (captures.length > 0) setStep('editor');
            }}
            className={`px-3 py-1.5 rounded-xl transition-colors ${
              step === 'editor' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500'
            }`}
          >
            3. Twibbon Editor
          </button>
        </div>
      </div>

      {/* STEP 1: CONFIG (ASPECT RATIO, CUT COUNT & TEMPLATE) */}
      {step === 'config' && (
        <div className="space-y-8">
          
          {/* Aspect Ratio Selector */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Square className="w-5 h-5 text-pink-500" />
              <span>Pilih Rasio & Format Photobooth:</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pilih ukuran cetak atau media sosial favoritmu. Canvas akan otomatis menyesuaikan proporsi frame.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { id: 'strip', label: 'Photo Strip', ratio: '4-Cut / 3-Cut', desc: 'Vertical Strip' },
                { id: '2:3', label: 'Photocard 2:3', ratio: '2 : 3', desc: 'Standard Card' },
                { id: '3:4', label: 'Portrait 3:4', ratio: '3 : 4', desc: 'Classic Print' },
                { id: '4:5', label: 'Feed 4:5', ratio: '4 : 5', desc: 'Instagram Feed' },
                { id: '9:16', label: 'Story 9:16', ratio: '9 : 16', desc: 'TikTok / Wallpaper' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAspectRatioChange(item.id as AspectRatioType)}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center ${
                    aspectRatio === item.id
                      ? 'border-pink-500 bg-pink-50/50 shadow-sm ring-2 ring-pink-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-900">{item.label}</span>
                  <span className="text-[11px] font-mono text-pink-600 font-bold mt-1">{item.ratio}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Number of Photos Selection */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-pink-500" />
              <span>Jumlah Slot Foto:</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {aspectRatio === 'strip' ? (
                <>
                  <button
                    onClick={() => setPhotoCount(4)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 4
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    4-Cut Classic Strip
                  </button>
                  <button
                    onClick={() => setPhotoCount(3)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 3
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    3-Cut Tall Strip
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setPhotoCount(1)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 1
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    1 Foto (Single Twibbon Frame)
                  </button>
                  <button
                    onClick={() => setPhotoCount(2)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 2
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    2 Foto (Split Cut)
                  </button>
                  <button
                    onClick={() => setPhotoCount(4)}
                    className={`px-5 py-3 rounded-2xl border text-xs font-bold transition-all ${
                      photoCount === 4
                        ? 'border-pink-500 bg-pink-50 text-pink-700 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    4 Foto (Grid 2x2)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Marketplace Exclusive Frame Templates (Rp 5.000, Rp 10.000 & Rp 15.000) */}
          <div className="bg-gradient-to-br from-pink-50/80 via-white to-purple-50/80 rounded-3xl p-6 border border-pink-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-600 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1">
                  <Flame className="w-3 h-3 text-amber-300" /> Marketplace Frame Collection
                </div>
                <h3 className="text-lg font-bold font-display text-slate-900">
                  Frame Template Marketplace (Rp 5.000, Rp 10.000 & Rp 15.000)
                </h3>
                <p className="text-xs text-slate-500">
                  Frame yang sudah kamu beli di Marketplace otomatis terbuka dan langsung bisa dipakai di Photobooth Live!
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLiveTemplateOverlay(true);
                    setPreviewerTab(purchasedFrameProducts.length > 0 ? 'purchased' : 'marketplace');
                    setStep('camera');
                  }}
                  className="text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 px-3.5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Buka Live Template Previewer</span>
                </button>
                <button
                  onClick={() => setActiveTab('marketplace')}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 px-3.5 py-2 rounded-xl bg-white border border-pink-200 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Lihat Semua di Marketplace</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {marketplaceFrameProducts.map((product) => {
                const tmpl = productToPhotoboothTemplate(product);
                const isOwned = product.price === 0 || hasPurchasedProduct(product.id);
                const isPendingAdmin = !isOwned && isProductPendingVerification(product.id);
                const isSelected = selectedTemplate.id === tmpl.id && !customFrameUrl;

                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelectMarketplaceFrame(product)}
                    className={`group cursor-pointer rounded-2xl p-3 border-2 transition-all flex flex-col justify-between relative overflow-hidden ${
                      isSelected
                        ? 'border-pink-600 bg-white shadow-lg shadow-pink-500/15 ring-2 ring-pink-500/20'
                        : isOwned
                        ? 'border-emerald-300 bg-white hover:border-emerald-500 hover:shadow-md'
                        : isPendingAdmin
                        ? 'border-amber-300 bg-white hover:border-amber-500 hover:shadow-md'
                        : 'border-slate-200 bg-white/90 hover:border-pink-300 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        {isOwned ? (
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Sudah Dibeli
                          </span>
                        ) : isPendingAdmin ? (
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> Menunggu ACC
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-pink-600 text-white">
                            Rp {product.price.toLocaleString('id-ID')}
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
                            Aktif
                          </span>
                        )}
                      </div>

                      <div
                        className="w-full h-28 rounded-xl flex flex-col items-center justify-center p-2 mb-2.5 border border-black/5 overflow-hidden relative"
                        style={{ backgroundColor: tmpl.themeColor }}
                      >
                        <img
                          src={product.previewImage || getProductFallbackImage(product)}
                          alt={product.name}
                          onError={(e) => {
                            const fb = getProductFallbackImage(product);
                            if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                          }}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                        />
                      </div>

                      <div className="text-xs font-bold text-slate-900 line-clamp-1">{product.name}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{tmpl.bannerText}</div>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectMarketplaceFrame(product);
                        }}
                        className={`w-full py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-pink-600 text-white'
                            : isOwned
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : isPendingAdmin
                            ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300'
                            : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3" /> Dipakai
                          </>
                        ) : isOwned ? (
                          <>
                            <Camera className="w-3 h-3" /> Pakai Frame
                          </>
                        ) : isPendingAdmin ? (
                          <>
                            <Clock className="w-3 h-3" /> Menunggu ACC Admin
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3 h-3" /> Beli Rp {(product.price / 1000).toFixed(0)}rb
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLivePreviewFrameInCamera(product);
                        }}
                        className="w-full py-1 px-2 rounded-lg text-[10px] font-semibold text-slate-600 hover:text-pink-700 bg-slate-100 hover:bg-pink-50 transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Live Camera Preview</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Standard Free Template & Frame Selection */}
          <div>
            {/* User Custom Templates section if user has saved any */}
            {userCustomTemplates.length > 0 && (
              <div className="mb-6 p-5 rounded-3xl bg-pink-50/60 border border-pink-200 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-600 animate-pulse" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Template Kustom Anda ({userCustomTemplates.length}):
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomTemplateModalOpen(true)}
                    className="text-xs font-bold text-pink-600 hover:text-pink-700 underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Tambah Template Baru</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {userCustomTemplates.map((tmpl) => {
                    const isSelected = selectedTemplate.id === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => {
                          setSelectedTemplate(tmpl);
                          setSelectedPhotoboothTemplate(tmpl);
                          setCustomBorderColor(tmpl.themeColor);
                          setCustomCaption(tmpl.bannerText);
                          if (tmpl.frameOverlayUrl) {
                            setCustomFrameUrl(tmpl.frameOverlayUrl);
                          } else {
                            setCustomFrameUrl(null);
                          }
                          if (tmpl.aspectRatio) {
                            setAspectRatio(tmpl.aspectRatio);
                          }
                          setCustomFrameRatioMismatch(false);
                        }}
                        className={`group cursor-pointer rounded-2xl p-3 border-2 transition-all flex flex-col items-center text-center relative overflow-hidden bg-white ${
                          isSelected
                            ? 'border-pink-600 shadow-md shadow-pink-500/20 ring-2 ring-pink-500/30'
                            : 'border-pink-200 hover:border-pink-400 hover:shadow-xs'
                        }`}
                      >
                        <span className="absolute top-2 left-2 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-pink-600 text-white z-10 shadow-2xs">
                          Kustom Anda
                        </span>

                        <div
                          className="w-full h-28 rounded-xl flex flex-col items-center justify-center p-2 mb-2 border border-black/5 relative overflow-hidden transition-transform group-hover:scale-102"
                          style={{ backgroundColor: tmpl.themeColor || '#ffffff' }}
                        >
                          {tmpl.frameOverlayUrl ? (
                            <img src={tmpl.frameOverlayUrl} alt={tmpl.name} className="w-full h-full object-contain" />
                          ) : (
                            <>
                              <div className="w-10 h-12 bg-white/90 rounded-md shadow-xs border border-white flex items-center justify-center mb-1">
                                <Camera className="w-4 h-4 text-slate-400" />
                              </div>
                              <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-white/80 truncate max-w-full" style={{ color: tmpl.textColor }}>
                                {tmpl.bannerText}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="text-xs font-bold text-slate-900 truncate w-full">{tmpl.name}</div>
                        <div className="text-[10px] text-pink-600 font-semibold mt-0.5">
                          {isSelected ? '✓ Terpasang' : 'Klik untuk Pakai'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                <span>Pilih Template Bawaan (Gratis) atau Masukkan Template:</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomTemplateModalOpen(true)}
                  className="text-xs font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 cursor-pointer flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Masukkan Template Sendiri</span>
                </button>

                <label className="text-xs font-bold text-pink-600 hover:text-pink-700 cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-50 border border-pink-200">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File PNG</span>
                  <input
                    type="file"
                    accept="image/png,image/webp"
                    onChange={handleCustomFrameUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {PHOTOBOOTH_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id && !customFrameUrl;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplate(tmpl);
                      setSelectedPhotoboothTemplate(tmpl);
                      setCustomBorderColor(tmpl.themeColor);
                      setCustomCaption(tmpl.bannerText);
                      setCustomFrameUrl(null);
                      setCustomFrameRatioMismatch(false);
                    }}
                    className={`group cursor-pointer rounded-2xl p-3 border-2 transition-all flex flex-col items-center text-center relative overflow-hidden ${
                      isSelected
                        ? 'border-pink-500 bg-white shadow-lg shadow-pink-500/10 scale-102'
                        : 'border-slate-200 bg-white hover:border-pink-300 hover:shadow-sm'
                    }`}
                  >
                    <div
                      className="w-full h-28 rounded-xl flex flex-col items-center justify-center p-2 mb-3 border border-black/5 transition-transform group-hover:scale-102"
                      style={{ backgroundColor: tmpl.themeColor }}
                    >
                      <div className="w-12 h-14 bg-white/90 rounded-md shadow-xs border border-white flex items-center justify-center mb-1">
                        <Camera className="w-4 h-4 text-slate-400" />
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 backdrop-blur-xs truncate max-w-full"
                        style={{ color: tmpl.textColor }}
                      >
                        {tmpl.bannerText.split('•')[0]}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-900 truncate w-full">{tmpl.name}</div>
                    <div className="text-[10px] text-slate-400">{tmpl.category}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action to Start Camera or Upload */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => {
                setCaptures([]);
                setCurrentCaptureIdx(0);
                setStep('camera');
              }}
              className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-bold text-base shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Camera className="w-5 h-5" />
              <span>Buka Kamera ({photoCount} Foto)</span>
            </button>

            <label className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-2.5 py-4 px-8 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-50 cursor-pointer transition-all active:scale-[0.98] shadow-sm">
              <Upload className="w-5 h-5 text-slate-500" />
              <span>Upload Foto ({photoCount} Foto)</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: CAMERA CAPTURE & REAL-TIME TEMPLATE PREVIEWER */}
      {step === 'camera' && (
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Template Previewer Top Control Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-200 text-pink-600 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 font-display">
                    Live Template Previewer
                  </h2>
                  <span className="text-xs font-semibold text-pink-600">
                    · {selectedTemplate.name} ({aspectRatio.toUpperCase()})
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Visualisasi real-time: Template yang kamu beli langsung ter-overlay di atas kamera live sebelum memotret.
                </p>
              </div>
            </div>

            {/* Previewer Mode & Overlay Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Layout Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCameraPreviewMode('split')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    cameraPreviewMode === 'split'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilkan Kamera dan Hasil Akhir secara berdampingan"
                >
                  <Columns className="w-3.5 h-3.5 text-pink-600" />
                  <span>Split Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreviewMode('composite')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    cameraPreviewMode === 'composite'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Fokus penuh pada simulasi hasil akhir dengan kamera live di dalam slot frame"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Full Frame Live</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreviewMode('camera')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    cameraPreviewMode === 'camera'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Layar kamera dengan overlay panduan frame"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-700" />
                  <span>Layar Kamera</span>
                </button>
              </div>

              {/* Toggle Frame Overlay */}
              <button
                type="button"
                onClick={() => setShowLiveTemplateOverlay((prev) => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  showLiveTemplateOverlay
                    ? 'bg-pink-50 border-pink-300 text-pink-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {showLiveTemplateOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showLiveTemplateOverlay ? 'Overlay Aktif' : 'Overlay Nonaktif'}</span>
              </button>

              {/* Toggle All Slots Live vs Active Slot Only */}
              {photoCount > 1 && (
                <button
                  type="button"
                  onClick={() => setLivePreviewAllSlots((prev) => !prev)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    livePreviewAllSlots
                      ? 'bg-purple-50 border-purple-300 text-purple-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Tampilkan kamera live di semua slot kosong sekaligus atau hanya slot aktif"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{livePreviewAllSlots ? 'Semua Slot Live' : 'Slot Aktif Saja'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Unowned Template Trial Banner (if user is previewing a Marketplace frame before purchasing) */}
          {previewingUnownedProduct && !hasPurchasedProduct(previewingUnownedProduct.id) && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs font-semibold text-amber-900">
                  Kamu sedang mencoba <span className="font-extrabold">"{previewingUnownedProduct.name}"</span> dalam mode Live Template Previewer. Beli frame ini (Rp {previewingUnownedProduct.price.toLocaleString('id-ID')}) untuk menyimpan dan mengunduh hasil akhir tanpa watermark preview.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSelectMarketplaceFrame(previewingUnownedProduct)}
                className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Beli & Unlock Frame (Rp {previewingUnownedProduct.price.toLocaleString('id-ID')})</span>
              </button>
            </div>
          )}

          {/* Main Live Camera & Real-Time Template Output Grid */}
          <div
            className={`grid grid-cols-1 ${
              cameraPreviewMode === 'split' ? 'lg:grid-cols-12' : 'lg:grid-cols-1'
            } gap-6 items-start`}
          >
            {/* LEFT / MAIN PANEL: Live Camera Viewfinder with Real-Time Slot Template Overlay */}
            <div
              className={
                cameraPreviewMode === 'composite'
                  ? 'sr-only'
                  : cameraPreviewMode === 'split'
                  ? 'lg:col-span-7'
                  : 'max-w-3xl mx-auto w-full'
              }
            >
              <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Kamera Live Viewfinder</span>
                  </span>
                  {showLiveTemplateOverlay && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-medium">Transparansi Overlay:</span>
                      <input
                        type="range"
                        min="25"
                        max="100"
                        step="5"
                        value={overlayOpacity}
                        onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                        className="w-20 accent-pink-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                      />
                      <span className="text-[11px] font-mono font-bold text-pink-600 w-8 text-right">
                        {overlayOpacity}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative bg-black rounded-2xl overflow-hidden shadow-xl border border-slate-800 aspect-[4/3] flex items-center justify-center">
                  {/* Primary Video Element (always mounted in step === 'camera' so snapshot capture works in every mode) */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedData={(e) => {
                      const v = e.currentTarget;
                      if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
                        setIsVideoReady(true);
                      }
                    }}
                    onCanPlay={(e) => {
                      const v = e.currentTarget;
                      if (v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0) {
                        setIsVideoReady(true);
                      }
                    }}
                    className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                  />

                  {/* Real-Time Template Frame HUD Overlay on Main Camera */}
                  {showLiveTemplateOverlay && (
                    <div
                      className="absolute inset-0 pointer-events-none flex flex-col justify-between transition-opacity duration-150"
                      style={{
                        opacity: overlayOpacity / 100,
                        borderWidth: '14px',
                        borderStyle: 'solid',
                        borderColor: customBorderColor || selectedTemplate.themeColor,
                      }}
                    >
                      {/* Top Template Header Banner Overlay */}
                      <div
                        className="px-4 py-2 flex items-center justify-between backdrop-blur-xs"
                        style={{
                          backgroundColor: `${customBorderColor || selectedTemplate.themeColor}dd`,
                          color: selectedTemplate.textColor,
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-extrabold tracking-wider uppercase truncate">
                            {selectedTemplate.bannerText}
                          </span>
                          <span className="text-[11px] opacity-80 truncate hidden sm:inline">
                            {selectedTemplate.koreanText}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 shrink-0">
                          {retakingSlotIdx !== null
                            ? `Slot #${retakingSlotIdx + 1}`
                            : `Slot #${Math.min(captures.length + 1, photoCount)} / ${photoCount}`}
                        </span>
                      </div>

                      {/* Center Slot Crop Aspect Guide & Floating Template Stickers */}
                      <div className="relative flex-1 flex items-center justify-center p-4">
                        {/* Floating Stickers from Template */}
                        {selectedTemplate.stickers.map((st, sIdx) => (
                          <span
                            key={sIdx}
                            className="absolute text-xl sm:text-2xl drop-shadow-md select-none"
                            style={{
                              left: `${Math.min(90, Math.max(8, st.x))}%`,
                              top: `${Math.min(85, Math.max(12, st.y))}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            {st.icon}
                          </span>
                        ))}

                        {/* Target Slot Aspect Ratio Guide Box */}
                        {(() => {
                          const targetIdx = retakingSlotIdx !== null ? retakingSlotIdx : Math.min(captures.length, currentLayout.windows.length - 1);
                          const activeWin = currentLayout.windows[targetIdx] || currentLayout.windows[0];
                          const winRatio = activeWin ? activeWin.width / activeWin.height : 4 / 3;
                          return (
                            <div
                              className="border-2 border-dashed border-white/75 rounded-xl shadow-inner flex items-end justify-center p-2 max-h-full max-w-full"
                              style={{
                                aspectRatio: `${winRatio}`,
                                height: winRatio >= 1 ? '78%' : '86%',
                              }}
                            >
                              <span className="text-[10px] font-semibold text-white/90 bg-black/45 px-2.5 py-0.5 rounded-md backdrop-blur-xs">
                                Area Potong Slot #{targetIdx + 1} • Pose di sini
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Bottom Slogan & Stickers Bar Overlay */}
                      <div
                        className="px-4 py-1.5 flex items-center justify-between text-xs backdrop-blur-xs"
                        style={{
                          backgroundColor: `${customBorderColor || selectedTemplate.themeColor}dd`,
                          color: selectedTemplate.textColor,
                        }}
                      >
                        <span className="font-bold truncate">{customCaption}</span>
                        <span className="text-sm tracking-widest shrink-0">{selectedStickers.join(' ')}</span>
                      </div>
                    </div>
                  )}

                  {/* Minimal Status Overlay when Template Overlay is toggled OFF */}
                  {!showLiveTemplateOverlay && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-md bg-black/60 text-white font-bold text-xs">
                          FOTO {retakingSlotIdx !== null ? retakingSlotIdx + 1 : captures.length + 1} / {photoCount}
                        </span>
                        <span className="px-3 py-1 rounded-md bg-black/60 text-white font-bold text-xs">
                          {selectedTemplate.name}
                        </span>
                      </div>
                      <div className="w-16 h-16 border border-dashed border-white/40 rounded-full mx-auto self-center" />
                      <div className="text-center">
                        <span className="text-xs text-white/90 bg-black/50 px-3 py-1 rounded-md">
                          Pose & bersiap!
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Flash on snapshot */}
                  {isFlashActive && (
                    <div className="absolute inset-0 bg-white z-30 animate-ping duration-150" />
                  )}

                  {/* Countdown Overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-xs">
                      <div className="text-8xl md:text-9xl font-black font-display text-white drop-shadow-2xl animate-bounce">
                        {countdown}
                      </div>
                    </div>
                  )}

                  {/* Camera error state */}
                  {hasCameraPermission === false && (
                    <div className="absolute inset-0 bg-slate-900 z-30 flex flex-col items-center justify-center p-6 text-center text-white">
                      <Camera className="w-12 h-12 text-rose-500 mb-3" />
                      <h3 className="text-lg font-bold mb-1">Akses Kamera Tidak Tersedia</h3>
                      <p className="text-sm text-slate-400 max-w-sm mb-4">
                        Izinkan akses kamera di browsermu atau beralih menggunakan fitur upload foto dari galeri.
                      </p>
                      <label className="py-2.5 px-5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-semibold text-sm cursor-pointer shadow-md">
                        Upload Foto Saja
                        <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT / COMPOSITE PANEL: Real-Time Final Output Visualization (Live Template Previewer) */}
            {cameraPreviewMode !== 'camera' && (
              <div
                className={
                  cameraPreviewMode === 'split'
                    ? 'lg:col-span-5'
                    : 'max-w-lg mx-auto w-full'
                }
              >
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col items-center">
                  <div className="w-full flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-pink-600" />
                        <span>Real-Time Final Output Preview</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Simulasi langsung hasil akhir frame dengan stream kamera live di tiap slot foto.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600 shrink-0">
                      {currentLayout.width}×{currentLayout.height}
                    </span>
                  </div>

                  {/* Real-Time Composite Frame Output Container */}
                  <div
                    className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-300 shadow-xl select-none flex items-center justify-center mx-auto"
                    style={{
                      aspectRatio: `${currentLayout.width} / ${currentLayout.height}`,
                      maxWidth:
                        cameraPreviewMode === 'composite'
                          ? aspectRatio === 'strip'
                            ? '310px'
                            : '420px'
                          : aspectRatio === 'strip'
                          ? '240px'
                          : aspectRatio === '9:16'
                          ? '260px'
                          : '330px',
                      backgroundColor: customBorderColor || selectedTemplate.themeColor,
                    }}
                  >
                    {/* LAYER 2: Photo Slots (Captured Photos + Live Camera Stream in Uncaptured/Active Windows) */}
                    {currentLayout.windows.map((win, idx) => {
                      const activeTargetSlot =
                        retakingSlotIdx !== null ? retakingSlotIdx : captures.length;
                      const isBeingRetaken = retakingSlotIdx === idx;
                      const existingCapture = !isBeingRetaken ? captures[idx] : undefined;
                      const isCurrentLiveSlot = idx === activeTargetSlot;
                      const shouldShowLiveStream =
                        !existingCapture && (isCurrentLiveSlot || livePreviewAllSlots);

                      return (
                        <div
                          key={idx}
                          className={`absolute overflow-hidden transition-all ${
                            isCurrentLiveSlot
                              ? 'ring-2 ring-pink-500 z-10'
                              : ''
                          }`}
                          style={{
                            left: `${(win.x / currentLayout.width) * 100}%`,
                            top: `${(win.y / currentLayout.height) * 100}%`,
                            width: `${(win.width / currentLayout.width) * 100}%`,
                            height: `${(win.height / currentLayout.height) * 100}%`,
                            borderRadius: `${Math.max(2, Math.round((win.borderRadius / currentLayout.width) * 260))}px`,
                          }}
                        >
                          {existingCapture ? (
                            <img
                              src={existingCapture.rawImage}
                              alt={`Captured Slot ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          ) : shouldShowLiveStream && activeStream ? (
                            <div className="relative w-full h-full">
                              <LiveVideoSlot
                                stream={activeStream}
                                mirrored={cameraFacing === 'user'}
                              />
                              {isCurrentLiveSlot && (
                                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-pink-600/90 text-white text-[9px] font-extrabold tracking-wider shadow-2xs">
                                  ● LIVE #{idx + 1}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full bg-slate-900/20 flex flex-col items-center justify-center text-white/80 p-2 text-center">
                              <Camera className="w-4 h-4 opacity-60 mb-0.5" />
                              <span className="text-[9px] font-bold">Slot #{idx + 1}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* LAYER 3 & 4: Template Stickers Overlay */}
                    {showLiveTemplateOverlay &&
                      selectedTemplate.stickers.map((st, i) => (
                        <span
                          key={i}
                          className="absolute z-15 pointer-events-none select-none text-base sm:text-lg drop-shadow-xs"
                          style={{
                            left: `${st.x}%`,
                            top: `${st.y}%`,
                            opacity: overlayOpacity / 100,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          {st.icon}
                        </span>
                      ))}

                    {/* LAYER 5: Transparent PNG Frame Overlay */}
                    {showLiveTemplateOverlay && generatedFramePng && (
                      <img
                        src={generatedFramePng}
                        alt="Live Frame Overlay"
                        style={{ opacity: overlayOpacity / 100 }}
                        className={`absolute inset-0 w-full h-full ${
                          customFrameUrl && customFrameRatioMismatch ? 'object-contain' : 'object-fill'
                        } pointer-events-none z-20 select-none transition-opacity duration-150`}
                      />
                    )}

                    {/* LAYER 6: Live Slogan / Caption Footer */}
                    {showLiveTemplateOverlay && customCaption && (
                      <div
                        className="absolute bottom-2 left-0 right-0 z-25 text-center pointer-events-none px-3"
                        style={{
                          color: selectedTemplate.textColor,
                          opacity: overlayOpacity / 100,
                        }}
                      >
                        <span className="text-[9px] sm:text-[10px] font-bold tracking-tight bg-black/25 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                          {customCaption}
                        </span>
                      </div>
                    )}

                    {/* Trial Watermark if previewing an unowned Marketplace frame */}
                    {previewingUnownedProduct && !hasPurchasedProduct(previewingUnownedProduct.id) && (
                      <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                        <div className="bg-black/55 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg -rotate-12 border border-white/30 shadow-lg">
                          LIVE PREVIEW • BELUM DIBELI
                        </div>
                      </div>
                    )}

                    {/* Countdown Overlay in Composite Mode */}
                    {cameraPreviewMode === 'composite' && countdown !== null && (
                      <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-xs">
                        <div className="text-7xl font-black font-display text-white drop-shadow-2xl animate-bounce">
                          {countdown}
                        </div>
                      </div>
                    )}

                    {/* Flash Effect in Composite Mode */}
                    {cameraPreviewMode === 'composite' && isFlashActive && (
                      <div className="absolute inset-0 bg-white z-40 animate-ping duration-150" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Camera Shutter & Action Controls Bar */}
          <div className="bg-white rounded-3xl p-4 sm:px-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            {retakingSlotIdx !== null ? (
              <button
                onClick={() => {
                  setRetakingSlotIdx(null);
                  setStep('editor');
                }}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 py-2.5 px-4 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Batal & Kembali ke Editor</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setCaptures([]);
                  setStep('config');
                }}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 py-2.5 px-4 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Pengaturan</span>
              </button>
            )}

            {/* Center Shutter Button + Slot Status */}
            <div className="flex items-center gap-4">
              <button
                onClick={triggerCountdownAndCapture}
                disabled={countdown !== null || !isVideoReady}
                className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 p-1.5 shadow-xl shadow-pink-500/30 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center cursor-pointer"
                title={isVideoReady ? 'Ambil Foto Sekarang' : 'Menunggu kamera siap...'}
              >
                <div className="w-full h-full rounded-full border-4 border-white flex items-center justify-center bg-white/20">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-sm" />
                </div>
              </button>
              <div className="hidden sm:block">
                <div className="text-xs font-extrabold text-slate-900">
                  {retakingSlotIdx !== null
                    ? `Ambil Ulang Slot #${retakingSlotIdx + 1}`
                    : `Ambil Foto Slot #${Math.min(captures.length + 1, photoCount)} dari ${photoCount}`}
                </div>
                <div className="text-[11px] text-slate-500">
                  {isVideoReady ? 'Kamera siap • Klik tombol shutter untuk hitung mundur 3 detik' : 'Memuat stream kamera...'}
                </div>
              </div>
            </div>

            {/* Right Actions: Flip Camera & Proceed to Editor if captures exist */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCameraFacing}
                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                title="Putar Kamera"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Flip Kamera</span>
              </button>

              {captures.length > 0 && (
                <button
                  onClick={() => {
                    if (previewingUnownedProduct && !hasPurchasedProduct(previewingUnownedProduct.id)) {
                      handleSelectMarketplaceFrame(previewingUnownedProduct);
                      return;
                    }
                    setStep('editor');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-pink-600 hover:bg-pink-700 py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <span>Lanjut ke Editor</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Captured Photos Progress Strip (Click any captured slot to retake) */}
          {captures.length > 0 && (
            <div className="flex items-center justify-center gap-3">
              {Array.from({ length: photoCount }).map((_, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (captures[i]) {
                      setRetakingSlotIdx(i);
                      showToast(`Mengambil ulang foto untuk Slot #${i + 1}`, 'info');
                    }
                  }}
                  className={`w-16 h-20 rounded-xl overflow-hidden border-2 bg-slate-100 flex items-center justify-center relative cursor-pointer transition-transform hover:scale-105 ${
                    retakingSlotIdx === i
                      ? 'border-amber-500 ring-2 ring-amber-400'
                      : captures[i]
                      ? 'border-pink-500 shadow-sm'
                      : 'border-dashed border-slate-300'
                  }`}
                  title={captures[i] ? `Klik untuk ambil ulang Slot #${i + 1}` : `Slot #${i + 1} belum diambil`}
                >
                  {captures[i] ? (
                    <img
                      src={captures[i].rawImage}
                      alt={`Captured ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* LIVE TEMPLATE PREVIEWER DOCK: Switch Purchased Templates & Format in Real Time */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-display flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-600" />
                  <span>Ganti Template & Frame Secara Real-Time</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih template yang sudah kamu beli untuk langsung melihat overlay-nya pada live camera stream.
                </p>
              </div>

              {/* Filter Tabs for Purchased vs Marketplace vs Free Templates */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setPreviewerTab('purchased')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    previewerTab === 'purchased'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Frame Terbeli ({purchasedFrameProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewerTab('marketplace')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    previewerTab === 'marketplace'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua Frame Marketplace ({marketplaceFrameProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewerTab('free')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    previewerTab === 'free'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Template Gratis ({PHOTOBOOTH_TEMPLATES.length})
                </button>
              </div>
            </div>

            {/* Tab 1: Purchased Templates */}
            {previewerTab === 'purchased' && (
              <div>
                {purchasedFrameProducts.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center space-y-3">
                    <ShoppingBag className="w-8 h-8 text-pink-500 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Belum Ada Frame Marketplace yang Dibeli</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Kamu bisa mencoba preview semua frame Rp 5.000, Rp 10.000 & Rp 15.000 secara live di kamera melalui tab Semua Frame Marketplace, atau beli untuk membuka akses penuh!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewerTab('marketplace')}
                      className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Coba & Lihat Frame Marketplace (Rp 5rb - Rp 15rb)
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {purchasedFrameProducts.map((product) => {
                      const tmpl = productToPhotoboothTemplate(product);
                      const isSelected = selectedTemplate.id === tmpl.id && !customFrameUrl;
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            applyTemplateFromProduct(product, false);
                            setShowLiveTemplateOverlay(true);
                          }}
                          className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'border-pink-600 bg-pink-50/50 shadow-md'
                              : 'border-emerald-200 bg-white hover:border-emerald-400'
                          }`}
                        >
                          <div>
                            <div className="w-full h-20 rounded-xl mb-2 p-1.5 flex items-center justify-center overflow-hidden border border-black/5" style={{ backgroundColor: tmpl.themeColor }}>
                              <img
                                src={product.previewImage || getProductFallbackImage(product)}
                                alt={product.name}
                                onError={(e) => {
                                  const fb = getProductFallbackImage(product);
                                  if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                                }}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="text-xs font-bold text-slate-900 line-clamp-1">{product.name}</div>
                            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                              ✓ Sudah Dibeli · {isSelected ? 'Sedang Aktif' : 'Klik untuk Overlay'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: All Marketplace Templates (supports both Instant Apply for Owned & Live Camera Trial Preview for Unowned) */}
            {previewerTab === 'marketplace' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {marketplaceFrameProducts.map((product) => {
                  const tmpl = productToPhotoboothTemplate(product);
                  const isOwned = product.price === 0 || hasPurchasedProduct(product.id);
                  const isSelected = selectedTemplate.id === tmpl.id && !customFrameUrl;
                  return (
                    <div
                      key={product.id}
                      className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-pink-600 bg-pink-50/40 shadow-md'
                          : isOwned
                          ? 'border-emerald-200 bg-white'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div
                        onClick={() => {
                          applyTemplateFromProduct(product, !isOwned);
                          setShowLiveTemplateOverlay(true);
                        }}
                        className="cursor-pointer"
                      >
                        <div className="w-full h-20 rounded-xl mb-2 p-1.5 flex items-center justify-center overflow-hidden border border-black/5" style={{ backgroundColor: tmpl.themeColor }}>
                          <img
                            src={product.previewImage || getProductFallbackImage(product)}
                            alt={product.name}
                            onError={(e) => {
                              const fb = getProductFallbackImage(product);
                              if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                            }}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-xs font-bold text-slate-900 line-clamp-1">{product.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {isOwned ? 'Sudah Dibeli ✓' : `Rp ${product.price.toLocaleString('id-ID')}`}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            applyTemplateFromProduct(product, !isOwned);
                            setShowLiveTemplateOverlay(true);
                          }}
                          className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold cursor-pointer ${
                            isSelected
                              ? 'bg-pink-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelected ? '✓ Sedang Di-preview' : 'Overlay di Kamera'}
                        </button>
                        {!isOwned && (
                          <button
                            type="button"
                            onClick={() => handleSelectMarketplaceFrame(product)}
                            className={`w-full py-1 px-2 rounded-lg text-[10px] font-bold cursor-pointer ${
                              isProductPendingVerification(product.id)
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                                : 'bg-pink-50 hover:bg-pink-100 text-pink-700'
                            }`}
                          >
                            {isProductPendingVerification(product.id)
                              ? '⏳ Menunggu ACC Admin'
                              : `Beli Rp ${(product.price / 1000).toFixed(0)}rb`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 3: Built-in Free Templates */}
            {previewerTab === 'free' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {PHOTOBOOTH_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id && !customFrameUrl;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(tmpl);
                        setSelectedPhotoboothTemplate(tmpl);
                        setCustomBorderColor(tmpl.themeColor);
                        setCustomCaption(tmpl.bannerText);
                        setCustomFrameUrl(null);
                        setCustomFrameRatioMismatch(false);
                        setPreviewingUnownedProduct(null);
                        setShowLiveTemplateOverlay(true);
                      }}
                      className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-pink-600 bg-pink-50/40 shadow-md'
                          : 'border-slate-200 bg-white hover:border-pink-300'
                      }`}
                    >
                      <div
                        className="w-full h-16 rounded-xl mb-2 flex items-center justify-center border border-black/5"
                        style={{ backgroundColor: tmpl.themeColor }}
                      >
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/80" style={{ color: tmpl.textColor }}>
                          {tmpl.bannerText.split('•')[0]}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate">{tmpl.name}</div>
                      <div className="text-[10px] text-slate-500">{tmpl.category} · Gratis</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: TWIBBON IMAGE EDITOR & COMPOSITE DECORATION */}
      {(step === 'editor' || step === 'decorate') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Live Twibbon-Style Interactive Canvas Viewport */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-pink-600" />
                  <span>Twibbon & Photo Placement Editor</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Setiap foto masuk ke slot masing-masing. Klik slot untuk mengatur zoom, geser, atau ganti foto.
                </p>
              </div>

              {/* Slot Selector Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                {Array.from({ length: photoCount }).map((_, idx) => {
                  const isFilled = !!captures[idx];
                  const isActive = activeEditIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveEditIndex(idx)}
                      className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-pink-600 text-white shadow-sm'
                          : 'bg-transparent text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isFilled ? (isActive ? 'bg-white' : 'bg-emerald-500') : 'bg-slate-300'
                        }`}
                      />
                      <span>Slot {idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Viewport with Real Transparent PNG Overlay & Precise Slot Geometry */}
            <div
              ref={previewContainerRef}
              className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-300 shadow-xl cursor-grab active:cursor-grabbing select-none flex items-center justify-center mx-auto"
              style={{
                aspectRatio: `${currentLayout.width} / ${currentLayout.height}`,
                maxWidth: aspectRatio === 'strip' ? '280px' : aspectRatio === '9:16' ? '300px' : '380px',
                backgroundColor: customBorderColor || selectedTemplate.themeColor,
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* LAYER 2: Separate, Independent Photo Windows mapped 1:1 to template slots */}
              {currentLayout.windows.map((win, idx) => {
                const capture = captures[idx];
                const isActive = activeEditIndex === idx;
                const scale = previewWidth > 0 ? previewWidth / currentLayout.width : 0.25;

                return (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveEditIndex(idx);
                    }}
                    className={`absolute overflow-hidden cursor-pointer transition-all ${
                      isActive
                        ? 'ring-2 ring-pink-500 ring-offset-1 z-20 shadow-md'
                        : 'hover:ring-2 hover:ring-pink-300/80 z-10'
                    }`}
                    style={{
                      left: `${(win.x / currentLayout.width) * 100}%`,
                      top: `${(win.y / currentLayout.height) * 100}%`,
                      width: `${(win.width / currentLayout.width) * 100}%`,
                      height: `${(win.height / currentLayout.height) * 100}%`,
                      borderRadius: `${Math.max(2, Math.round(win.borderRadius * scale))}px`,
                    }}
                  >
                    {capture ? (
                      <div
                        className="w-full h-full relative overflow-hidden flex items-center justify-center origin-center"
                        style={{
                          transform: calculatePhotoTransform(capture, win, scale).cssTransform,
                          transition: isDragging && isActive ? 'none' : 'transform 75ms ease-out',
                        }}
                      >
                        <img
                          src={capture.rawImage}
                          alt={`Foto Slot ${idx + 1}`}
                          draggable={false}
                          className="max-w-none w-full h-full object-cover pointer-events-none select-none"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-black/10 border border-dashed border-white/50 text-slate-500 p-2 text-center select-none">
                        <Camera className="w-4 h-4 opacity-40 mb-1" />
                        <span className="text-[10px] font-bold">Slot #{idx + 1} Kosong</span>
                      </div>
                    )}

                    {/* Active slot indicator badge */}
                    {isActive && (
                      <div className="absolute top-1.5 left-1.5 z-30 pointer-events-none">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-pink-600 text-white shadow-xs">
                          Slot #{idx + 1} Aktif
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* LAYER 5: Frame PNG Overlay sitting on top */}
              {generatedFramePng && (
                <img
                  src={generatedFramePng}
                  alt="Transparent Frame Overlay"
                  className={`absolute inset-0 w-full h-full ${
                    customFrameUrl && customFrameRatioMismatch ? 'object-contain' : 'object-fill'
                  } pointer-events-none z-15 select-none`}
                />
              )}

              {/* Slogan banner preview */}
              {customCaption && (
                <div
                  className="absolute bottom-2.5 left-0 right-0 z-20 text-center pointer-events-none px-4"
                  style={{ color: selectedTemplate.textColor }}
                >
                  <span className="text-[10px] md:text-[11px] font-bold tracking-tight bg-black/25 text-white px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    {customCaption}
                  </span>
                </div>
              )}
            </div>

            {/* Transform Controls Toolbar */}
            <div className="w-full mt-6 space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                  <span>Pengaturan Foto: Slot #{activeEditIndex + 1}</span>
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {captures[activeEditIndex] ? '✓ Foto Terpasang' : 'Belum Ada Foto'}
                </span>
              </div>

              {/* Photo Retake / Upload options for active slot */}
              <div className="grid grid-cols-2 gap-2">
                <label className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-pink-50 hover:text-pink-600 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-pink-500" />
                  <span>Ganti File #{activeEditIndex + 1}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReplaceActivePhoto}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleRetakeActiveSlot}
                  className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-pink-50 hover:text-pink-600 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-pink-500" />
                  <span>Kamera Ulang #{activeEditIndex + 1}</span>
                </button>
              </div>

              {/* Zoom Slider Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-pink-600" />
                    <span>Zoom / Skala:</span>
                  </span>
                  <span className="font-mono text-pink-600 font-bold">
                    {Math.round((currentCapture?.zoom || 1.0) * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleZoomStep(-0.1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.05"
                    value={currentCapture?.zoom || 1.0}
                    onChange={(e) => handleZoomSlider(parseFloat(e.target.value))}
                    className="flex-1 accent-pink-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <button
                    onClick={() => handleZoomStep(0.1)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Directional Nudge Pad & Rotation Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* Arrow Nudge Pad */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col items-center">
                  <span className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                    <Move className="w-3 h-3 text-slate-400" /> Geser Posisi (Nudge)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5 w-28">
                    <div />
                    <button
                      onClick={() => handleNudge(0, -25)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 shadow-xs flex items-center justify-center active:scale-95"
                      title="Nudge Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div />
                    <button
                      onClick={() => handleNudge(-25, 0)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 shadow-xs flex items-center justify-center active:scale-95"
                      title="Nudge Left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateCurrentPhoto((p) => ({ ...p, panX: 0, panY: 0 }))}
                      className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 text-[10px] font-bold flex items-center justify-center"
                      title="Center"
                    >
                      •
                    </button>
                    <button
                      onClick={() => handleNudge(25, 0)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 shadow-xs flex items-center justify-center active:scale-95"
                      title="Nudge Right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <div />
                    <button
                      onClick={() => handleNudge(0, 25)}
                      className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 shadow-xs flex items-center justify-center active:scale-95"
                      title="Nudge Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <div />
                  </div>
                </div>

                {/* Rotation & Flip Controls */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-slate-400" /> Rotasi & Cermin
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleRotateStep(-90)}
                      className="py-2.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 text-xs font-semibold flex flex-col items-center gap-1 shadow-xs active:scale-95 transition-all"
                      title="Putar ke kiri (-90°)"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="text-[10px]">-90°</span>
                    </button>

                    <button
                      onClick={() => handleRotateStep(90)}
                      className="py-2.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-pink-50 hover:text-pink-600 text-slate-700 text-xs font-semibold flex flex-col items-center gap-1 shadow-xs active:scale-95 transition-all"
                      title="Putar ke kanan (+90°)"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span className="text-[10px]">+90°</span>
                    </button>

                    <button
                      onClick={handleFlipHorizontal}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 shadow-xs active:scale-95 transition-all ${
                        currentCapture?.isFlipped
                          ? 'bg-pink-100 border-pink-400 text-pink-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                      title="Flip Horizontal (Mirror)"
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      <span className="text-[10px]">Mirror</span>
                    </button>
                  </div>

                  <button
                    onClick={handleResetCurrent}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Slot Ini</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Customization, Smart Caption, & Export Options */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Quick Switcher for Purchased Marketplace Frames & Templates */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-500" />
                  <span>Pilih / Ganti Frame Photobooth:</span>
                </h3>
                <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full">
                  {selectedTemplate.name}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Terapkan langsung Frame Marketplace (Rp 5.000 / Rp 10.000 / Rp 15.000) yang sudah kamu beli tanpa mengulang foto.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {marketplaceFrameProducts.map((product) => {
                  const tmpl = productToPhotoboothTemplate(product);
                  const isOwned = product.price === 0 || hasPurchasedProduct(product.id);
                  const isSelected = selectedTemplate.id === tmpl.id && !customFrameUrl;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleSelectMarketplaceFrame(product)}
                      className={`p-2.5 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'border-pink-600 bg-pink-50/70 ring-1 ring-pink-500'
                          : isOwned
                          ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50'
                          : 'border-slate-200 hover:border-pink-300'
                      }`}
                    >
                      <div
                        className="w-9 h-9 rounded-xl shrink-0 border border-black/10 overflow-hidden flex items-center justify-center"
                        style={{ backgroundColor: tmpl.themeColor }}
                      >
                        <img
                          src={product.previewImage || getProductFallbackImage(product)}
                          alt={product.name}
                          onError={(e) => {
                            const fb = getProductFallbackImage(product);
                            if (e.currentTarget.src !== fb) e.currentTarget.src = fb;
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-900 truncate">{product.name}</div>
                        <div className="text-[10px] font-semibold">
                          {isOwned ? (
                            <span className="text-emerald-600">✓ Sudah Dibeli</span>
                          ) : (
                            <span className="text-pink-600">Beli Rp {(product.price / 1000).toFixed(0)}rb</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frame Background Color Customizer */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-pink-500" />
                <span>Warna Frame Photo Strip:</span>
              </h3>
              <div className="flex items-center gap-2.5 flex-wrap">
                {[
                  { name: 'Sky Pastel', color: '#e0f2fe' },
                  { name: 'Sakura Pink', color: '#fce7f3' },
                  { name: 'Lilac Violet', color: '#f3e8ff' },
                  { name: 'Matcha Mint', color: '#dcfce7' },
                  { name: 'Teddy Cream', color: '#fef3c7' },
                  { name: 'Midnight Noir', color: '#18181b' },
                  { name: 'Pure White', color: '#ffffff' },
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => {
                      setCustomBorderColor(item.color);
                      setCustomFrameUrl(null);
                    }}
                    className={`w-9 h-9 rounded-full border-2 transition-all relative ${
                      customBorderColor === item.color
                        ? 'ring-2 ring-pink-500 scale-110 border-white'
                        : 'border-slate-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  >
                    {customBorderColor === item.color && (
                      <Check className={`w-4 h-4 mx-auto ${item.color === '#18181b' ? 'text-white' : 'text-slate-800'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Caption Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-base font-bold text-slate-900">
                    Smart Caption:
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Buat caption secara otomatis untuk fotomu.
                  </p>
                </div>
                <button
                  onClick={fetchAiCaptions}
                  disabled={aiCaptionsLoading}
                  className="px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all disabled:opacity-50 shrink-0"
                  title="Buat caption secara otomatis untuk fotomu"
                >
                  <span>{aiCaptionsLoading ? 'Membuat...' : 'Buat Caption'}</span>
                </button>
              </div>

              <input
                type="text"
                value={customCaption}
                onChange={(e) => setCustomCaption(e.target.value)}
                maxLength={45}
                placeholder="Tulis caption kreasimu atau pilih Smart Caption..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />

              {aiSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {aiSuggestions.map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => setCustomCaption(sug)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-medium transition-colors truncate max-w-[220px]"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export Format Selector */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-pink-500" />
                <span>Format File Output:</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'png', label: 'PNG', desc: 'Lossless HD' },
                  { id: 'jpeg', label: 'JPEG', desc: 'Foto Tajam' },
                  { id: 'webp', label: 'WebP', desc: 'Ringan & Cepat' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setExportFormat(fmt.id as 'png' | 'jpeg' | 'webp')}
                    className={`py-2 px-3 rounded-xl border text-center transition-all ${
                      exportFormat === fmt.id
                        ? 'border-pink-500 bg-pink-50 text-pink-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs">{fmt.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{fmt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Final High-Res Strip Button */}
            <button
              onClick={generateHighResComposite}
              disabled={isGenerating}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-extrabold text-base shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>{isGenerating ? 'Merender High Resolution...' : `Generate Photobooth ${aspectRatio.toUpperCase()}!`}</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FINAL STRIP RESULT & ACTIONS */}
      {step === 'result' && finalImageUrl && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Photo Strip Live Preview using authentic layout aspect ratio */}
          <div className="md:col-span-6 flex justify-center">
            <div
              className="relative p-2 rounded-2xl bg-white shadow-2xl border border-slate-200 w-full max-w-[340px] transition-transform hover:scale-102"
              style={{
                aspectRatio: `${currentLayout.width} / ${currentLayout.height}`,
              }}
            >
              <img
                src={finalImageUrl}
                alt="K-Click Final Strip"
                className="w-full h-full object-contain rounded-xl"
              />
              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-pink-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                ✓
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="md:col-span-6 space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase text-pink-600 tracking-wider">
                Selesai! • Your K-Click is Ready
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold font-display text-slate-900">
                Karya Photobooth Kamu Siap!
              </h2>
              <p className="text-sm text-slate-500">
                Format resolusi tinggi 1600px+ ({exportFormat.toUpperCase()}) telah dirender sempurna melalui layer canvas tanpa kompresi screenshot.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleDownload}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-base shadow-lg shadow-pink-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Download ({exportFormat.toUpperCase()} High Resolution)</span>
              </button>

              <button
                onClick={handleSaveToGallery}
                className="w-full py-3.5 px-6 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-sm border border-purple-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-purple-600" />
                <span>Simpan ke My Gallery</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast('Tautan K-Click berhasil disalin!', 'success');
                }}
                className="w-full py-3 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan Link Hasil Foto</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setStep('editor')}
                className="text-xs font-bold text-pink-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Edit Lagi Posisi Foto</span>
              </button>

              <button
                onClick={() => setActiveTab('gallery')}
                className="text-xs font-bold text-slate-600 hover:underline cursor-pointer"
              >
                Lihat My Gallery →
              </button>
            </div>
          </div>
        </div>
      )}
      {/* In-Photobooth Checkout Modal for Buying Rp 15.000 / Rp 20.000 Frame Templates */}
      {checkoutFrameProduct && (
        <CheckoutModal
          product={checkoutFrameProduct}
          onClose={() => {
            const prod = checkoutFrameProduct;
            setCheckoutFrameProduct(null);
            if (prod && hasPurchasedProduct(prod.id)) {
              const tmpl = productToPhotoboothTemplate(prod);
              setSelectedTemplate(tmpl);
              setSelectedPhotoboothTemplate(tmpl);
              setCustomBorderColor(tmpl.themeColor);
              setCustomCaption(tmpl.bannerText);
            }
          }}
        />
      )}

      {/* Modal for User to Input & Use Their Own Custom Template */}
      <CustomTemplateModal
        isOpen={isCustomTemplateModalOpen}
        onClose={() => setIsCustomTemplateModalOpen(false)}
        onTemplateCreatedAndApply={(tmpl) => {
          setSelectedTemplate(tmpl);
          setSelectedPhotoboothTemplate(tmpl);
          setCustomBorderColor(tmpl.themeColor);
          setCustomCaption(tmpl.bannerText);
          if (tmpl.stickers && tmpl.stickers.length > 0) {
            setSelectedStickers(tmpl.stickers.map((s) => s.icon));
          }
          if (tmpl.frameOverlayUrl) {
            setCustomFrameUrl(tmpl.frameOverlayUrl);
          } else {
            setCustomFrameUrl(null);
          }
          if (tmpl.aspectRatio) {
            setAspectRatio(tmpl.aspectRatio);
          }
          setCustomFrameRatioMismatch(false);
        }}
      />
    </div>
  );
};
