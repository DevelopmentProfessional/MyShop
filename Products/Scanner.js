const FORMAT_TO_READER = {
    ean_13: "ean_reader",
    ean_8: "ean_8_reader",
    upc_a: "upc_reader",
    upc_e: "upc_e_reader",
    code_128: "code_128_reader",
    code_39: "code_39_reader",
    code_39_vin: "code_39_vin_reader",
    codabar: "codabar_reader",
    i2of5: "i2of5_reader",
    code_93: "code_93_reader"
    // "2of5" is not supported by Quagga and should be removed from your select
};

class BarcodeScanner {
    constructor() {
        this.statusElem = document.getElementById('status');
        this.resultElem = document.getElementById('result');
        this.startButton = document.getElementById('startButton');
        this.stopButton = document.getElementById('stopButton');
        this.deviceSelect = document.getElementById('deviceSelect');
        this.formatSelect = document.getElementById('formatSelect');
        this.isRunning = false;
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        this.startButton.addEventListener('click', () => this.startScanning());
        this.stopButton.addEventListener('click', () => this.stopScanning());
        this.deviceSelect.addEventListener('change', () => {
            if (this.isRunning) {
                this.stopScanning();
                this.startScanning();
            }
        });
        this.formatSelect.addEventListener('change', () => {
            if (this.isRunning) {
                this.stopScanning();
                this.startScanning();
            }
        });

        // Hide device select on mobile as we'll force environment facing camera
        if (this.isMobile) {
            this.deviceSelect.style.display = 'none';
        }

        this.initializeCameraDevices();
    }

    async initializeCameraDevices() {
        this.setStatus('Requesting camera access...', 'stripe');
        try {
            // First request general camera permission
            await navigator.mediaDevices.getUserMedia({ video: true });
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (!this.isMobile) {
                this.deviceSelect.innerHTML = '';
                videoDevices.forEach((device, idx) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.text = device.label || `Camera ${idx + 1}`;
                    this.deviceSelect.appendChild(option);
                });
            }
            
            if (videoDevices.length === 0) {
                this.setStatus('No camera devices found.', 'error');
                this.startButton.disabled = true;
            } else {
                this.setStatus('Ready. Click Start Camera to begin scanning.', 'success');
                this.startButton.disabled = false;
            }
        } catch (err) {
            console.error('Camera access error:', err);
            this.setStatus('Error accessing camera. Please ensure camera permissions are granted.', 'error');
            this.startButton.disabled = true;
        }
    }

    startScanning() {
        if (this.isRunning) return;
        this.setStatus('Starting camera...', 'stripe');
        this.resultElem.textContent = 'No barcode detected';
        this.resultElem.className = '';
        
        const selectedFormat = this.formatSelect.value;
        const reader = FORMAT_TO_READER[selectedFormat];
        
        if (!reader) {
            this.setStatus('Barcode format not supported.', 'error');
            return;
        }

        const constraints = {
            width: { min: 640 },
            height: { min: 480 }
        };

        // On mobile, always use environment facing camera
        if (this.isMobile) {
            constraints.facingMode = { exact: 'environment' };
        } else {
            // On desktop, use selected device
            const selectedDeviceId = this.deviceSelect.value;
            if (selectedDeviceId) {
                constraints.deviceId = { exact: selectedDeviceId };
            }
        }

        Quagga.init({
            inputStream: {
                type: 'LiveStream',
                constraints: constraints,
                target: document.getElementById('interactive')
            },
            decoder: {
                readers: [reader],
                debug: {
                    drawBoundingBox: true,
                    showPattern: true
                }
            },
            locate: true
        }, err => {
            if (err) {
                console.error('Quagga initialization error:', err);
                this.setStatus('Error initializing camera: ' + err.message, 'error');
                this.isRunning = false;
                return;
            }
            Quagga.start();
            this.isRunning = true;
            this.setStatus('Scanning... Point camera at barcode.', 'success');
            this.startButton.disabled = true;
            this.stopButton.disabled = false;

            // Force video/canvas to fit parent
            setTimeout(() => {
                const interactive = document.getElementById('interactive');
                if (interactive) {
                    const video = interactive.querySelector('video');
                    const canvases = interactive.querySelectorAll('canvas');
                    if (video) {
                        video.style.width = '100%';
                        video.style.height = '100%';
                        video.style.objectFit = 'contain';
                    }
                    canvases.forEach(canvas => {
                        canvas.style.width = '100%';
                        canvas.style.height = '100%';
                        canvas.style.position = 'absolute';
                        canvas.style.top = 0;
                        canvas.style.left = 0;
                    });
                }
            }, 500); // Delay to ensure Quagga has injected the elements
        });

        Quagga.onDetected(this.onDetected = result => {
            const code = result.codeResult.code;
            this.resultElem.textContent = `Detected: ${code}`;
            this.resultElem.className = 'success';
            this.setStatus('Barcode detected!', 'success');
            // Optional: Play a success sound
            this.playBeepSound();
        });

        Quagga.onProcessed(this.onProcessed = result => {
            const drawingCtx = Quagga.canvas.ctx.overlay;
            const drawingCanvas = Quagga.canvas.dom.overlay;

            if (result) {
                if (result.boxes) {
                    //drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                    result.boxes.filter(function (box) {
                        return box !== result.box;
                    }).forEach(function (box) {
                        Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
                    });
                }

                if (result.box) {
                    Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
                }

                if (result.codeResult && result.codeResult.code) {
                    Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'red', lineWidth: 3 });
                }
            }
        });
    }

    playBeepSound() {
        // Create and play a short beep sound
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 1500;
        gainNode.gain.value = 0.5;
        
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioCtx.close();
        }, 100);
    }

    stopScanning() {
        if (!this.isRunning) return;
        Quagga.stop();
        Quagga.offDetected(this.onDetected);
        Quagga.offProcessed(this.onProcessed);
        this.isRunning = false;
        this.setStatus('Camera stopped.', 'stripe');
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
    }

    setStatus(msg, type) {
        this.statusElem.textContent = msg;
        this.statusElem.className = type ? type : '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BarcodeScanner();
});