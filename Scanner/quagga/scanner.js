import Quagga from 'quagga';

document.addEventListener("DOMContentLoaded", function () {
  const resultContainer = document.getElementById('result');
  const statusContainer = document.getElementById('status');
  const deviceSelect = document.getElementById('deviceSelect');
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');
  let isRunning = false;

  // Add barcode format selector
  const formatSelect = document.createElement('select');
  formatSelect.id = 'formatSelect';
  formatSelect.innerHTML = `
    <option value="ean_13">EAN-13</option>
    <option value="ean_8">EAN-8</option>
    <option value="upc_a">UPC-A</option>
    <option value="upc_e">UPC-E</option>
    <option value="code_128">Code 128</option>
    <option value="code_39">Code 39</option>
    <option value="code_39_vin">Code 39 VIN</option>
    <option value="codabar">Codabar</option>
    <option value="i2of5">Interleaved 2 of 5</option>
    <option value="2of5">Standard 2 of 5</option>
    <option value="code_93">Code 93</option>
  `;
  formatSelect.value = 'ean_13'; // Set default to EAN-13
  document.querySelector('.controls').insertBefore(formatSelect, startButton);

  function setStatus(msg, type = '') {
    statusContainer.textContent = msg;
    statusContainer.className = type ? `status ${type}` : 'status';
  }

  function setResult(msg, type = '') {
    resultContainer.textContent = msg;
    resultContainer.className = type ? `result ${type}` : 'result';
  }

  function populateDevices(deviceInfos) {
    deviceSelect.innerHTML = '';
    deviceInfos.forEach((device, i) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Camera ${i + 1}`;
      deviceSelect.appendChild(option);
    });
  }

  // Check if browser supports required features
  function checkBrowserSupport() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('Your browser does not support camera access. Please use a modern browser.', 'error');
      return false;
    }
    return true;
  }

  // Request camera access explicitly
  async function requestCameraAccess() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 640 },
          height: { min: 480 },
          facingMode: "environment"
        }
      });
      
      // Stop the stream immediately after getting permission
      stream.getTracks().forEach(track => track.stop());
      
      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error("No video input devices found.");
      }
      
      populateDevices(videoDevices);
      setStatus('Camera access granted. Select a camera and press Start Camera.', 'success');
      return true;
    } catch (err) {
      setStatus('Camera access denied or not supported: ' + err.message, 'error');
      return false;
    }
  }

  // Format barcode result for display
  function formatBarcodeResult(result) {
    const code = result.codeResult.code;
    const format = result.codeResult.format;
    let formattedCode = code;

    // Handle different barcode formats
    switch(format) {
      case 'ean_13':
        // Ensure EAN-13 is properly formatted
        formattedCode = code.padStart(13, '0');
        break;
      case 'ean_8':
        // Ensure EAN-8 is properly formatted
        formattedCode = code.padStart(8, '0');
        break;
      case 'upc_a':
        // Ensure UPC-A is properly formatted
        formattedCode = code.padStart(12, '0');
        break;
      case 'code_128':
      case 'code_39':
        // These formats can contain letters and numbers
        formattedCode = code;
        break;
      default:
        formattedCode = code;
    }

    return {
      code: formattedCode,
      format: format,
      raw: result
    };
  }

  function startQuagga() {
    if (isRunning) return;
    isRunning = true;
    setStatus('Starting camera...', 'stripe');
    setResult('No barcode detected');

    const config = {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: document.querySelector('#interactive'),
        constraints: {
          facingMode: "environment",
          focusMode: "continuous", // Enable continuous focus
          advanced: [{
            focusMode: "continuous",
            exposureMode: "continuous",
            whiteBalanceMode: "continuous"
          }]
        }
      },
      decoder: {
        readers: [formatSelect.value], // Use selected format
        multiple: false
      },
      locate: true,
      locator: {
        halfSample: true,
        patchSize: "medium"
      },
      frequency: 15,
      debug: {
        drawBoundingBox: true,
        showFrequency: true,
        drawScanline: true,
        showPattern: true
      }
    };

    Quagga.init(config, function (err) {
      if (err) {
        setStatus('Error initializing camera: ' + err, 'error');
        setResult('Initialization failed', 'error');
        isRunning = false;
        return;
      }
      
      Quagga.start();
      setStatus('Camera started. Aim at a barcode.', 'success');
      stopButton.disabled = false;
      startButton.disabled = true;
      formatSelect.disabled = true; // Disable format selection while scanning

      // Add debug overlay for better scanning feedback
      Quagga.onProcessed(function(result) {
        const drawingCtx = Quagga.canvas.ctx.overlay;
        const drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
          if (result.boxes) {
            drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
            result.boxes.filter(function (box) {
              return box !== result.box;
            }).forEach(function (box) {
              Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
            });
          }

          if (result.box) {
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "blue", lineWidth: 2 });
          }

          if (result.codeResult && result.codeResult.code) {
            Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: "red", lineWidth: 3 });
          }
        }
      });
    });

    Quagga.onDetected(function(result) {
      if (result.codeResult.code) {
        // Log the full result for debugging
        console.log("Full barcode result:", result);
        
        // Format the result based on barcode type
        const formattedResult = formatBarcodeResult(result);
        
        // Display the formatted result
        setResult(`Barcode Detected: ${formattedResult.code} (Format: ${formattedResult.format})`, 'success');
        setStatus('Barcode detected!', 'success');


        
        // Log additional details
        console.log("Formatted result:", formattedResult);
        console.log("Barcode format:", formattedResult.format);
        console.log("Raw code:", formattedResult.code);
        
        stopQuagga();
      }
    });
  }

  function stopQuagga() {
    if (!isRunning) return;
    Quagga.stop();
    setStatus('Camera stopped.', 'stripe');
    stopButton.disabled = true;
    startButton.disabled = false;
    formatSelect.disabled = false; // Re-enable format selection
    isRunning = false;
  }

  // Initialize the scanner
  async function initialize() {
    if (!checkBrowserSupport()) {
      return;
    }

    try {
      await requestCameraAccess();
    } catch (err) {
      setStatus('Failed to initialize camera: ' + err.message, 'error');
    }
  }

  // Start initialization
  initialize();

  startButton.addEventListener('click', startQuagga);
  stopButton.addEventListener('click', stopQuagga);

  deviceSelect.addEventListener('change', () => {
    if (isRunning) {
      stopQuagga();
      startQuagga();
    }
  });
}); 