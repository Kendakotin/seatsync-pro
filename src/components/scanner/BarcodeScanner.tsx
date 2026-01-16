import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Camera, ScanBarcode, X, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: string) => void;
  bulkMode?: boolean;
  onBulkScan?: (results: string[]) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScan, bulkMode = false, onBulkScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const scannerContainerId = 'barcode-scanner-container';

  // Supported formats for all IT asset barcodes
  const supportedFormats = [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.CODE_93,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.ITF,
    Html5QrcodeSupportedFormats.CODABAR,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
    Html5QrcodeSupportedFormats.PDF_417,
  ];

  useEffect(() => {
    if (open) {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            const cameraList = devices.map((device) => ({
              id: device.id,
              label: device.label || `Camera ${device.id}`,
            }));
            setCameras(cameraList);
            // Prefer back camera for mobile devices
            const backCamera = cameraList.find(
              (cam) => cam.label.toLowerCase().includes('back') || cam.label.toLowerCase().includes('rear')
            );
            setSelectedCamera(backCamera?.id || cameraList[0].id);
          } else {
            toast.error('No cameras found on this device');
          }
        })
        .catch((err) => {
          console.error('Error getting cameras:', err);
          toast.error('Failed to access camera. Please check permissions.');
        });
    }

    return () => {
      stopScanner();
    };
  }, [open]);

  useEffect(() => {
    if (open && selectedCamera && !isScanning) {
      startScanner();
    }
  }, [selectedCamera, open]);

  const startScanner = async () => {
    if (!selectedCamera || isScanning) return;

    try {
      // Stop any existing scanner first
      await stopScanner();

      // Small delay to ensure cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: supportedFormats,
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Prevent duplicate scans
          if (decodedText !== lastScanned) {
            setLastScanned(decodedText);
            
            if (bulkMode) {
              // In bulk mode, add to list if not already present
              setScannedItems((prev) => {
                if (prev.includes(decodedText)) {
                  toast.info(`Already scanned: ${decodedText}`);
                  return prev;
                }
                toast.success(`Added: ${decodedText}`);
                return [...prev, decodedText];
              });
            } else {
              toast.success(`Scanned: ${decodedText}`);
              onScan(decodedText);
            }
          }
        },
        () => {
          // Ignore scan failures (expected when no barcode in frame)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      if (err.message?.includes('NotAllowedError')) {
        toast.error('Camera access denied. Please allow camera permissions.');
      } else {
        toast.error('Failed to start scanner: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.log('Scanner cleanup:', err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = async () => {
    await stopScanner();
    setLastScanned('');
    setScannedItems([]);
    onOpenChange(false);
  };

  const handleApplyBulk = async () => {
    if (scannedItems.length > 0 && onBulkScan) {
      onBulkScan(scannedItems);
    }
    await handleClose();
  };

  const handleRemoveItem = (item: string) => {
    setScannedItems((prev) => prev.filter((i) => i !== item));
  };

  const handleClearAll = () => {
    setScannedItems([]);
    setLastScanned('');
  };

  const handleCameraChange = async (cameraId: string) => {
    await stopScanner();
    setSelectedCamera(cameraId);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5" />
            {bulkMode ? 'Bulk Barcode Scanner' : 'Barcode Scanner'}
          </DialogTitle>
          <DialogDescription>
            {bulkMode 
              ? 'Scan multiple barcodes in sequence. Click "Apply" when done to filter all scanned assets.'
              : 'Position the barcode within the frame. Supports all major barcode formats.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Camera Selection */}
          {cameras.length > 1 && (
            <div className="flex items-center gap-3">
              <Label htmlFor="camera-select" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Camera
              </Label>
              <Select value={selectedCamera} onValueChange={handleCameraChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.id} value={camera.id}>
                      {camera.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Scanner View */}
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <div
              id={scannerContainerId}
              className="w-full min-h-[250px]"
              style={{ position: 'relative' }}
            />
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center text-muted-foreground">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Mode: Scanned Items List */}
          {bulkMode && scannedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Scanned Items ({scannedItems.length})
                </Label>
                <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-7 text-xs">
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 rounded-lg border bg-muted/30">
                {scannedItems.map((item, index) => (
                  <Badge
                    key={`${item}-${index}`}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span className="font-mono text-xs">{item}</span>
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Single Mode: Last Scanned Result */}
          {!bulkMode && lastScanned && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">Last scanned:</p>
              <p className="font-mono font-medium text-primary">{lastScanned}</p>
            </div>
          )}

          {/* Supported Formats Info */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Supported formats:</p>
            <p>QR Code, Code 128, Code 39, Code 93, EAN-13, EAN-8, UPC-A, UPC-E, ITF, Codabar, Data Matrix, PDF 417</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              <X className="w-4 h-4 mr-2" />
              {bulkMode ? 'Cancel' : 'Close'}
            </Button>
            {bulkMode && (
              <Button onClick={handleApplyBulk} disabled={scannedItems.length === 0}>
                <Check className="w-4 h-4 mr-2" />
                Apply ({scannedItems.length})
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
