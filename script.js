document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const dropzone = document.querySelector('.dropzone');
    const widthInput = document.getElementById('widthInput');
    const heightInput = document.getElementById('heightInput');
    const lockAspect = document.getElementById('lockAspect');
    const targetSize = document.getElementById('targetSize');
    const qualityInput = document.getElementById('qualityInput');
    const originalPreview = document.getElementById('originalPreview');
    const resizedPreview = document.getElementById('resizedPreview');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const fileInfo = document.getElementById('fileInfo');

    // State variables
    let originalImage = null;
    let originalWidth = 0;
    let originalHeight = 0;
    let aspectRatio = 0;
    let resizedImageUrl = null;

    // Event Listeners
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', handleDragOver);
    dropzone.addEventListener('dragleave', handleDragLeave);
    dropzone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    widthInput.addEventListener('input', handleDimensionChange);
    heightInput.addEventListener('input', handleDimensionChange);
    lockAspect.addEventListener('change', updateAspectLock);
    targetSize.addEventListener('input', handleTargetSizeChange);
    qualityInput.addEventListener('input', updateQualityDisplay);
    downloadBtn.addEventListener('click', downloadResizedImage);
    resetBtn.addEventListener('click', resetTool);

    // Functions
    function handleDragOver(e) {
        e.preventDefault();
        dropzone.classList.add('active');
    }

    function handleDragLeave() {
        dropzone.classList.remove('active');
    }

    function handleDrop(e) {
        e.preventDefault();
        dropzone.classList.remove('active');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelect({ target: fileInput });
        }
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file || !file.type.match('image.*')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            originalImage = new Image();
            originalImage.onload = function() {
                originalWidth = this.width;
                originalHeight = this.height;
                aspectRatio = originalWidth / originalHeight;

                // Set initial dimensions
                widthInput.value = originalWidth;
                heightInput.value = originalHeight;

                // Display original image
                originalPreview.innerHTML = '';
                originalPreview.appendChild(createImageElement(this));

                // Process image
                processImage();

                // Update file info
                updateFileInfo(file);
            };
            originalImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function handleDimensionChange(e) {
        if (!originalImage) return;

        if (lockAspect.checked) {
            if (e.target === widthInput) {
                heightInput.value = Math.round(widthInput.value / aspectRatio);
            } else {
                widthInput.value = Math.round(heightInput.value * aspectRatio);
            }
        }

        processImage();
    }

    function updateAspectLock() {
        if (lockAspect.checked && originalImage) {
            aspectRatio = widthInput.value / heightInput.value;
        }
    }

    function handleTargetSizeChange() {
        if (!originalImage || !targetSize.value) return;
        
        // Convert KB to bytes
        const targetBytes = targetSize.value * 1024;
        optimizeForFileSize(targetBytes);
    }

    function optimizeForFileSize(targetBytes) {
        if (!originalImage) return;

        let minQuality = 1;
        let maxQuality = 100;
        let bestQuality = 80; // default
        let bestSize = Infinity;
        let attempts = 0;
        const maxAttempts = 10; // prevent infinite loops

        // Binary search to find optimal quality
        while (attempts < maxAttempts && minQuality <= maxQuality) {
            const midQuality = Math.floor((minQuality + maxQuality) / 2);
            qualityInput.value = midQuality;
            
            const result = processImage(false); // process without preview update
            const currentSize = getBase64Size(result);

            if (Math.abs(currentSize - targetBytes) < Math.abs(bestSize - targetBytes)) {
                bestQuality = midQuality;
                bestSize = currentSize;
            }

            if (currentSize > targetBytes) {
                maxQuality = midQuality - 1;
            } else {
                minQuality = midQuality + 1;
            }

            attempts++;
        }

        // Set the best found quality
        qualityInput.value = bestQuality;
        processImage();
    }

    function getBase64Size(base64) {
        // Calculate size in bytes from base64 string
        return (base64.length * 3) / 4 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    }

    function updateQualityDisplay() {
        // You can add a display element for quality if needed
    }

    function processImage(updatePreview = true) {
        if (!originalImage) return null;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const width = parseInt(widthInput.value) || originalWidth;
        const height = parseInt(heightInput.value) || originalHeight;
        const quality = parseInt(qualityInput.value) / 100;

        canvas.width = width;
        canvas.height = height;

        // Draw image with new dimensions
        ctx.drawImage(originalImage, 0, 0, width, height);

        // Get resized image as data URL
        const mimeType = 'image/jpeg';
        const imageData = canvas.toDataURL(mimeType, quality);

        if (updatePreview) {
            // Update preview
            resizedPreview.innerHTML = '';
            const img = createImageElement(canvas);
            resizedPreview.appendChild(img);

            // Enable download button
            resizedImageUrl = imageData;
            downloadBtn.disabled = false;

            // Update size display
            updateResizedSize(imageData);
        }

        return imageData;
    }

    function createImageElement(source) {
        const img = document.createElement('img');
        img.src = source.src || source.toDataURL();
        img.className = 'max-w-full max-h-80 object-contain';
        return img;
    }

    function updateFileInfo(file) {
        const sizeInKB = (file.size / 1024).toFixed(2);
        fileInfo.textContent = `Original: ${file.name}`;
        document.getElementById('originalSize').textContent = `Size: ${sizeInKB} KB`;
        document.getElementById('originalDimensions').textContent = `Dimensions: ${originalWidth}×${originalHeight}px`;
    }

    function updateResizedSize(base64) {
        const sizeInBytes = (base64.length * 3) / 4 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
        const sizeInKB = (sizeInBytes / 1024).toFixed(2);
        const width = parseInt(widthInput.value) || originalWidth;
        const height = parseInt(heightInput.value) || originalHeight;
        document.getElementById('resizedSize').textContent = `Size: ${sizeInKB} KB`;
        document.getElementById('resizedDimensions').textContent = `Dimensions: ${width}×${height}px`;
        return sizeInBytes;
    }

    function downloadResizedImage() {
        if (!resizedImageUrl) return;

        const link = document.createElement('a');
        link.href = resizedImageUrl;
        link.download = `resized-${fileInput.files[0].name.split('.')[0]}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function resetTool() {
        fileInput.value = '';
        originalImage = null;
        originalPreview.innerHTML = '<p class="text-gray-400">No image selected</p>';
        resizedPreview.innerHTML = '<p class="text-gray-400">Preview will appear here</p>';
        widthInput.value = '';
        heightInput.value = '';
        targetSize.value = '';
        qualityInput.value = 80;
        downloadBtn.disabled = true;
        fileInfo.textContent = '';
        dropzone.classList.remove('active');
    }
});