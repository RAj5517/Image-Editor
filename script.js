// script.js — Advanced Image Editor with Enhanced Functionality and Optimizations

document.addEventListener('DOMContentLoaded', () => {
    const imageEditor = new ImageEditor();
    imageEditor.init();
});

/**
 * ImageEditor Class
 * Encapsulates all functionalities of the Image Editor application.
 */
class ImageEditor {
    constructor() {
        // DOM Elements
        this.uploadImage = document.getElementById("uploadImage");
        this.imageCanvas = document.getElementById("imageCanvas");
        this.ctx = this.imageCanvas.getContext("2d");
        this.filters = document.getElementById("filters");
        this.cropButton = document.getElementById("cropButton");
        this.rotateButton = document.getElementById("rotateButton");
        this.undoButton = document.getElementById("undoButton");
        this.redoButton = document.getElementById("redoButton");
        this.resetButton = document.getElementById("resetButton");
        this.downloadButton = document.getElementById("downloadButton");
        this.cropModal = document.getElementById("cropModal");
        this.closeCropModalBtn = this.cropModal.querySelector(".close");
        this.applyCropBtn = document.getElementById("applyCrop");
        this.cancelCropBtn = document.getElementById("cancelCrop");
        this.cropCanvas = document.getElementById("cropCanvas");
        this.cropCtx = this.cropCanvas.getContext("2d");
        this.toast = document.getElementById('toast');
        this.toastMessage = document.getElementById('toast-message');
        this.closeToastBtn = document.querySelector('.close-toast');

        // Image and State Variables
        this.img = new Image();
        this.originalImageData = null;
        this.currentFilter = 'none';
        this.rotation = 0; // in degrees
        this.isCropping = false;
        this.cropStartX = 0;
        this.cropStartY = 0;
        this.cropWidth = 0;
        this.cropHeight = 0;

        // Undo/Redo Stacks
        this.undoStack = [];
        this.redoStack = [];

        // Binding methods to ensure proper 'this' context
        this.loadImage = this.loadImage.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * Initialize the Image Editor application.
     */
    init() {
        this.bindEvents();
    }

    /**
     * Bind all necessary event listeners.
     */
    bindEvents() {
        // Handle Image Upload
        this.uploadImage.addEventListener("change", (e) => this.handleImageUpload(e));

        // Handle Filter Change
        this.filters.addEventListener("change", () => this.applyFilter());

        // Handle Crop Button Click
        this.cropButton.addEventListener("click", () => this.openCropModal());

        // Handle Rotate Button Click
        this.rotateButton.addEventListener("click", () => this.rotateImage());

        // Handle Undo Button Click
        this.undoButton.addEventListener("click", () => this.undo());

        // Handle Redo Button Click
        this.redoButton.addEventListener("click", () => this.redo());

        // Handle Reset Button Click
        this.resetButton.addEventListener("click", () => this.resetImage());

        // Handle Download Button Click
        this.downloadButton.addEventListener("click", () => this.downloadImage());

        // Handle Crop Modal Close
        this.closeCropModalBtn.addEventListener("click", () => this.closeCropModalFunc());
        this.cancelCropBtn.addEventListener("click", () => this.closeCropModalFunc());

        // Handle Apply Crop
        this.applyCropBtn.addEventListener("click", () => this.applyCropFunc());

        // Handle Toast Close
        this.closeToastBtn.addEventListener("click", () => this.hideToast());

        // Handle Keyboard Accessibility for Modal and Toast
        window.addEventListener('keydown', this.handleKeyDown);

        // Set Image Load Handler
        this.img.addEventListener('load', this.loadImage);
    }

    /**
     * Handle Image Upload
     */
    handleImageUpload(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                this.img.src = reader.result;
            };
            reader.readAsDataURL(file);
        } else {
            this.showToast('Please upload a valid image file.', 'error');
        }
    }

    /**
     * Load Image into Canvas
     */
    loadImage() {
        // Reset Rotation
        this.rotation = 0;

        // Calculate Dimensions
        const maxWidth = 800;
        const maxHeight = 600;
        let width = this.img.width;
        let height = this.img.height;

        if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
        }
        if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
        }

        // Set Canvas Dimensions
        this.imageCanvas.width = width;
        this.imageCanvas.height = height;

        // Draw Image
        this.ctx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
        this.ctx.drawImage(this.img, 0, 0, width, height);

        // Store Original Image Data
        this.originalImageData = this.ctx.getImageData(0, 0, width, height);

        // Reset Filters
        this.currentFilter = 'none';
        this.filters.value = 'none';
        this.ctx.filter = 'none';

        // Reset Undo/Redo Stacks
        this.undoStack = [];
        this.redoStack = [];

        // Push Initial State to Undo Stack
        this.pushToUndoStack();

        this.showToast('Image loaded successfully.', 'success');
    }

    /**
     * Apply Selected Filter to the Image
     */
    applyFilter() {
        if (!this.originalImageData) {
            this.showToast('Please upload an image first.', 'warning');
            return;
        }

        this.currentFilter = this.filters.value;

        // Reset to Original Image
        this.ctx.putImageData(this.originalImageData, 0, 0);

        // Apply Rotation if any
        this.applyRotation();

        // Apply Filter
        this.ctx.filter = this.currentFilter !== 'vintage' ? this.currentFilter : 'sepia(60%) brightness(90%)';
        this.ctx.drawImage(this.imageCanvas, 0, 0, this.imageCanvas.width, this.imageCanvas.height);
        this.ctx.filter = 'none'; // Reset filter

        // Save State
        this.pushToUndoStack();

        this.showToast('Filter applied.', 'success');
    }

    /**
     * Apply Rotation to the Image
     */
    applyRotation() {
        if (this.rotation !== 0) {
            // Create an off-screen canvas for rotation
            const offCanvas = document.createElement('canvas');
            const offCtx = offCanvas.getContext('2d');

            if (this.rotation === 90 || this.rotation === 270) {
                offCanvas.width = this.imageCanvas.height;
                offCanvas.height = this.imageCanvas.width;
            } else {
                offCanvas.width = this.imageCanvas.width;
                offCanvas.height = this.imageCanvas.height;
            }

            offCtx.translate(offCanvas.width / 2, offCanvas.height / 2);
            offCtx.rotate(this.rotation * Math.PI / 180);
            offCtx.drawImage(this.imageCanvas, -this.imageCanvas.width / 2, -this.imageCanvas.height / 2);

            // Resize main canvas
            this.imageCanvas.width = offCanvas.width;
            this.imageCanvas.height = offCanvas.height;

            // Draw rotated image
            this.ctx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
            this.ctx.drawImage(offCanvas, 0, 0);

            // Update originalImageData
            this.originalImageData = this.ctx.getImageData(0, 0, this.imageCanvas.width, this.imageCanvas.height);
        }
    }

    /**
     * Rotate Image by 90 Degrees
     */
    rotateImage() {
        if (!this.originalImageData) {
            this.showToast('Please upload an image first.', 'warning');
            return;
        }

        this.rotation = (this.rotation + 90) % 360;
        this.applyRotation();

        // Save State
        this.pushToUndoStack();

        this.showToast('Image rotated 90 degrees.', 'success');
    }

    /**
     * Open Crop Modal
     */
    openCropModal() {
        if (!this.originalImageData) {
            this.showToast('Please upload an image first.', 'warning');
            return;
        }
        this.cropModal.style.display = "block";
        this.cropModal.setAttribute('aria-hidden', 'false');
        this.loadCropCanvas();
    }

    /**
     * Load Image into Crop Canvas
     */
    loadCropCanvas() {
        const width = this.imageCanvas.width;
        const height = this.imageCanvas.height;

        this.cropCanvas.width = width;
        this.cropCanvas.height = height;
        this.cropCtx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        this.cropCtx.drawImage(this.imageCanvas, 0, 0, this.cropCanvas.width, this.cropCanvas.height);

        // Initialize Crop Rectangle
        this.isCropping = false;
        this.cropStartX = 0;
        this.cropStartY = 0;
        this.cropWidth = 0;
        this.cropHeight = 0;

        // Remove existing event listeners to prevent multiple bindings
        this.cropCanvas.onmousedown = null;
        this.cropCanvas.onmousemove = null;
        this.cropCanvas.onmouseup = null;

        // Add Event Listeners for Cropping
        this.cropCanvas.onmousedown = (e) => this.startCropping(e);
        this.cropCanvas.onmousemove = (e) => this.drawCroppingRect(e);
        this.cropCanvas.onmouseup = () => this.endCropping();
    }

    /**
     * Start Cropping - Mouse Down Event
     */
    startCropping(e) {
        const rect = this.cropCanvas.getBoundingClientRect();
        this.cropStartX = e.clientX - rect.left;
        this.cropStartY = e.clientY - rect.top;
        this.isCropping = true;
    }

    /**
     * Draw Cropping Rectangle - Mouse Move Event
     */
    drawCroppingRect(e) {
        if (!this.isCropping) return;

        const rect = this.cropCanvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        this.cropWidth = currentX - this.cropStartX;
        this.cropHeight = currentY - this.cropStartY;

        // Redraw Image
        this.cropCtx.clearRect(0, 0, this.cropCanvas.width, this.cropCanvas.height);
        this.cropCtx.drawImage(this.imageCanvas, 0, 0, this.cropCanvas.width, this.cropCanvas.height);

        // Draw Rectangle
        this.cropCtx.strokeStyle = "red";
        this.cropCtx.lineWidth = 2;
        this.cropCtx.setLineDash([6]);
        this.cropCtx.strokeRect(this.cropStartX, this.cropStartY, this.cropWidth, this.cropHeight);
        this.cropCtx.setLineDash([]);
    }

    /**
     * End Cropping - Mouse Up Event
     */
    endCropping() {
        this.isCropping = false;
    }

    /**
     * Apply Crop to the Image
     */
    applyCropFunc() {
        if (this.cropWidth === 0 || this.cropHeight === 0) {
            this.showToast('Please select a crop area.', 'warning');
            return;
        }

        // Calculate absolute values and ensure positive dimensions
        const x = this.cropWidth < 0 ? this.cropStartX + this.cropWidth : this.cropStartX;
        const y = this.cropHeight < 0 ? this.cropStartY + this.cropHeight : this.cropStartY;
        const width = Math.abs(this.cropWidth);
        const height = Math.abs(this.cropHeight);

        // Prevent cropping outside the canvas
        if (x < 0 || y < 0 || (x + width) > this.cropCanvas.width || (y + height) > this.cropCanvas.height) {
            this.showToast('Crop area is out of bounds.', 'error');
            return;
        }

        // Get Cropped Image Data
        const croppedData = this.cropCtx.getImageData(x, y, width, height);

        // Update Canvas Size
        this.imageCanvas.width = width;
        this.imageCanvas.height = height;

        // Draw Cropped Image
        this.ctx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
        this.ctx.putImageData(croppedData, 0, 0);

        // Update Image Source
        this.img.src = this.imageCanvas.toDataURL();

        // Close Crop Modal
        this.closeCropModalFunc();

        // Save State
        this.pushToUndoStack();

        this.showToast('Image cropped successfully.', 'success');
    }

    /**
     * Close Crop Modal
     */
    closeCropModalFunc() {
        this.cropModal.style.display = "none";
        this.cropModal.setAttribute('aria-hidden', 'true');
        // Remove Crop Event Listeners
        this.cropCanvas.onmousedown = null;
        this.cropCanvas.onmousemove = null;
        this.cropCanvas.onmouseup = null;
    }

    /**
     * Reset Image to Original State
     */
    resetImage() {
        if (!this.originalImageData) {
            this.showToast('No image to reset.', 'warning');
            return;
        }

        this.ctx.filter = 'none';
        this.filters.value = 'none';
        this.currentFilter = 'none';
        this.rotation = 0;
        this.imageCanvas.width = this.originalImageData.width;
        this.imageCanvas.height = this.originalImageData.height;
        this.ctx.putImageData(this.originalImageData, 0, 0);
        this.img.src = this.imageCanvas.toDataURL();

        // Clear Undo/Redo Stacks
        this.undoStack = [];
        this.redoStack = [];

        // Push Initial State to Undo Stack
        this.pushToUndoStack();

        this.showToast('Image reset to original.', 'success');
    }

    /**
     * Download Edited Image
     */
    downloadImage() {
        if (!this.originalImageData) {
            this.showToast('Please upload and edit an image first.', 'warning');
            return;
        }

        const link = document.createElement("a");
        link.download = "edited-image.png";
        link.href = this.imageCanvas.toDataURL("image/png");
        link.click();
        this.showToast('Image downloaded successfully.', 'success');
    }

    /**
     * Undo Last Action
     */
    undo() {
        if (this.undoStack.length > 1) {
            // Pop current state and push to redo stack
            const currentState = this.undoStack.pop();
            this.redoStack.push(currentState);

            // Get the previous state
            const previousState = this.undoStack[this.undoStack.length - 1];
            this.restoreState(previousState);

            this.showToast('Undo performed.', 'info');
        } else {
            this.showToast('No more actions to undo.', 'warning');
        }
    }

    /**
     * Redo Last Undone Action
     */
    redo() {
        if (this.redoStack.length > 0) {
            const state = this.redoStack.pop();
            this.restoreState(state);
            this.undoStack.push(state);
            this.showToast('Redo performed.', 'info');
        } else {
            this.showToast('No more actions to redo.', 'warning');
        }
    }

    /**
     * Push Current State to Undo Stack
     */
    pushToUndoStack() {
        const state = this.imageCanvas.toDataURL();
        this.undoStack.push(state);
        // Clear redo stack whenever a new action is performed
        this.redoStack = [];
    }

    /**
     * Restore Canvas from a Given State
     */
    restoreState(state) {
        const img = new Image();
        img.src = state;
        img.onload = () => {
            // Reset Rotation
            this.rotation = 0;

            // Set Canvas Dimensions
            this.imageCanvas.width = img.width;
            this.imageCanvas.height = img.height;

            // Draw Image
            this.ctx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
            this.ctx.drawImage(img, 0, 0, this.imageCanvas.width, this.imageCanvas.height);

            // Update originalImageData
            this.originalImageData = this.ctx.getImageData(0, 0, this.imageCanvas.width, this.imageCanvas.height);
        };
    }

    /**
     * Show Toast Notification
     */
    showToast(message, type) {
        this.toastMessage.textContent = message;
        this.toast.classList.remove('success', 'error', 'warning', 'info');
        this.toast.classList.add(type);
        this.toast.style.display = 'flex';

        // Clear any existing timeout to prevent multiple toasts overlapping
        if (this.toast.timeoutId) {
            clearTimeout(this.toast.timeoutId);
        }

        // Auto-hide after 3 seconds
        this.toast.timeoutId = setTimeout(() => {
            this.hideToast();
        }, 3000);
    }

    /**
     * Hide Toast Notification
     */
    hideToast() {
        this.toast.style.display = 'none';
    }

    /**
     * Handle Keyboard Events for Accessibility
     */
    handleKeyDown(e) {
        if (e.key === 'Escape') {
            if (this.cropModal.style.display === "block") {
                this.closeCropModalFunc();
            }
            if (this.toast.style.display === "flex") {
                this.hideToast();
            }
        }
    }
}