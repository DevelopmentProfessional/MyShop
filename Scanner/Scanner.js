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

        this.initializeCameraDevices();
    }

    async initializeCameraDevices() {
        this.setStatus('Requesting camera access...', 'stripe');
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            this.deviceSelect.innerHTML = '';
            videoDevices.forEach((device, idx) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${idx + 1}`;
                this.deviceSelect.appendChild(option);
            });
            if (videoDevices.length === 0) {
                this.setStatus('No camera devices found.', 'error');
                this.startButton.disabled = true;
            } else {
                this.setStatus('Ready. Select camera and format.', 'success');
                this.startButton.disabled = false;
            }
        } catch (err) {
            this.setStatus('Error accessing camera devices.', 'error');
            this.startButton.disabled = true;
        }
    }

    startScanning() {
        if (this.isRunning) return;
        this.setStatus('Starting camera...', 'stripe');
        this.resultElem.textContent = 'No barcode detected';
        this.resultElem.className = '';
        const selectedDeviceId = this.deviceSelect.value;
        const selectedFormat = this.formatSelect.value;

        // Use the mapping to get the correct reader
        const reader = FORMAT_TO_READER[selectedFormat];
        if (!reader) {
            this.setStatus('Barcode format not supported.', 'error');
            return;
        }

        Quagga.init({
            inputStream: {
                type: 'LiveStream',
                constraints: {
                    width: { min: 640 },
                    height: { min: 480 },
                    facingMode: 'environment',
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
                },
                target: document.getElementById('interactive')
            },
            decoder: {
                readers: [reader]
            },
            locate: true
        }, err => {
            if (err) {
                this.setStatus('Error initializing camera: ' + err.message, 'error');
                this.isRunning = false;
                return;
            }
            Quagga.start();
            this.isRunning = true;
            this.setStatus('Scanning... Point camera at barcode.', 'success');
            this.startButton.disabled = true;
            this.stopButton.disabled = false;
        });

        Quagga.onDetected(this.onDetected = result => {
            const code = result.codeResult.code;
            this.resultElem.textContent = `Detected: ${code}`;
            this.resultElem.className = 'success';
            this.setStatus('Barcode detected!', 'success');
        });

        Quagga.onProcessed(this.onProcessed = result => {
            // Optionally, you can add drawing overlays here
        });
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