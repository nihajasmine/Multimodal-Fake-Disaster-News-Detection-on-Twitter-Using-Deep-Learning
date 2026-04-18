// Navigation and functionality
document.addEventListener('DOMContentLoaded', function() {
    // Navigation functionality
    const navButtons = document.querySelectorAll('.nav-btn');
    const homeView = document.getElementById('home-view');
    const testView = document.getElementById('test-view');

    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const view = this.dataset.view;
            
            // Update active nav button
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show/hide views
            if (view === 'home') {
                homeView.classList.add('active-view');
                testView.classList.remove('active-view');
            } else if (view === 'test') {
                homeView.classList.remove('active-view');
                testView.classList.add('active-view');
            }
        });
    });

    // Input type button functionality
    const inputTypeButtons = document.querySelectorAll('.input-type-btn');
    const textInput = document.getElementById('text-input');
    const imageInput = document.getElementById('image-input');
    const fileUploadBtn = document.querySelector('.file-upload-btn');
    let uploadedImagePreview = null;

    // Handle input type button clicks
    inputTypeButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            inputTypeButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');

            const type = this.dataset.type;
            
            if (type === 'text') {
                textInput.required = true;
                textInput.style.display = 'block';
                imageInput.style.display = 'none';
                fileUploadBtn.style.display = 'none';
                imageInput.value = '';
                uploadedImagePreview = null;
            } else if (type === 'image') {
                textInput.required = true;
                textInput.style.display = 'block';
                imageInput.style.display = 'none';
                fileUploadBtn.style.display = 'flex';
                imageInput.value = '';
                uploadedImagePreview = null;
                updateUploadButtonText('Upload Image');
            }
        });
    });

    // Function to update upload button text
    function updateUploadButtonText(text) {
        if (fileUploadBtn) {
            const uploadText = fileUploadBtn.querySelector('.upload-text');
            if (uploadText) {
                uploadText.textContent = text.length > 20 ? text.substring(0, 20) + '...' : text;
            }
        }
    }

    // Handle file upload
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                this.value = '';
                uploadedImagePreview = null;
                updateUploadButtonText('Upload Image');
                return;
            }

            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('Image size should be less than 10MB');
                this.value = '';
                uploadedImagePreview = null;
                updateUploadButtonText('Upload Image');
                return;
            }

            // Update button text
            updateUploadButtonText(file.name);

            // Create preview URL for display
            const reader = new FileReader();
            reader.onload = function(event) {
                uploadedImagePreview = event.target.result;
            };
            reader.onerror = function() {
                alert('Error reading image file');
                imageInput.value = '';
                uploadedImagePreview = null;
                updateUploadButtonText('Upload Image');
            };
            reader.readAsDataURL(file);
        } else {
            uploadedImagePreview = null;
            updateUploadButtonText('Upload Image');
        }
    });

    // Predict button functionality
    const predictBtn = document.querySelector('.predict-btn');
    const resultContainer = document.getElementById('result-container');
    const resultBody = document.getElementById('result-body');

    predictBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const textValue = textInput.value.trim();
        const activeType = document.querySelector('.input-type-btn.active').dataset.type;

        // Validate text input (compulsory)
        if (!textValue) {
            textInput.style.borderColor = '#ff6b6b';
            textInput.focus();
            alert('Text field is required!');
            return;
        }

        // Reset border color
        textInput.style.borderColor = 'rgba(102, 126, 234, 0.3)';

        // Show loading state
        const originalText = this.textContent;
        this.textContent = 'Processing...';
        this.disabled = true;
        resultContainer.style.display = 'none';

        try {
            // Prepare FormData for API call
            const formData = new FormData();
            formData.append('text', textValue);
            
            // Add image file if in image mode and file is selected
            if (activeType === 'image' && imageInput.files[0]) {
                formData.append('image', imageInput.files[0]);
            }

            // Make API call to Flask backend
            const response = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Display result with tweet and image
            const imageUrl = uploadedImagePreview || '';
            displayResult(result, textValue, imageUrl, activeType);
            resultContainer.style.display = 'block';

        } catch (error) {
            console.error('Error:', error);
            resultBody.innerHTML = `
                <div class="result-error">
                    <p><strong>Error:</strong> ${error.message}</p>
                    <p>Make sure the Flask server (app.py) is running on http://localhost:5000</p>
                </div>
            `;
            resultContainer.style.display = 'block';
        } finally {
            // Reset button state
            this.textContent = originalText;
            this.disabled = false;
        }
    });

    // Function to display prediction results
    function displayResult(result, tweetText, imageUrl, inputType) {
        const isDisaster = result.disaster;
        const confidence = (result.confidence * 100).toFixed(1);
        const type = result.type || 'None';
        const location = result.location && result.location.length > 0 ? result.location.join(', ') : 'Not detected';
        const urgency = result.urgency || 'None';
        const hasImage = inputType === 'image' && imageUrl;

        resultBody.innerHTML = `
            <!-- Tweet Display -->
            <div class="tweet-display">
                <div class="tweet-content">
                    <div class="tweet-text">${escapeHtml(tweetText)}</div>
                </div>
                ${hasImage ? `
                    <div class="image-display">
                        <img src="${escapeHtml(imageUrl)}" alt="Tweet Image" class="tweet-image" onerror="this.parentElement.style.display='none';">
                    </div>
                ` : ''}
            </div>
            
            <!-- Prediction Result -->
            <div class="result-item ${isDisaster ? 'disaster' : 'no-disaster'}">
                <div class="result-status">
                    <span class="status-icon">${isDisaster ? '⚠️' : '✅'}</span>
                    <span class="status-text">${isDisaster ? 'Disaster Detected' : 'No Disaster'}</span>
                </div>
                <div class="result-details">
                    <div class="detail-row">
                        <span class="detail-label">Confidence:</span>
                        <span class="detail-value">${confidence}%</span>
                    </div>
                    ${isDisaster ? `
                        <div class="detail-row">
                            <span class="detail-label">Type:</span>
                            <span class="detail-value">${type}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Urgency:</span>
                            <span class="detail-value urgency-${urgency.toLowerCase()}">${urgency}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Location:</span>
                            <span class="detail-value">${location}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Reset form when switching to home view
    navButtons.forEach(button => {
        if (button.dataset.view === 'home') {
            button.addEventListener('click', function() {
                // Reset form
                textInput.value = '';
                imageInput.value = '';
                uploadedImagePreview = null;
                updateUploadButtonText('Upload Image');
                textInput.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                resultContainer.style.display = 'none';
                
                // Reset to text mode
                inputTypeButtons.forEach(btn => {
                    if (btn.dataset.type === 'text') {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                textInput.style.display = 'block';
                imageInput.style.display = 'none';
                fileUploadBtn.style.display = 'none';
            });
        }
    });

    // Latest Tweets button functionality
    const latestTweetsBtn = document.querySelector('.latest-tweets-btn');
    latestTweetsBtn.addEventListener('click', async function () {
        const tweetsContainer = document.querySelector('.tweets-container');
        tweetsContainer.innerHTML = '<div class="tweet-item">Loading...</div>';
    
        try {
            const response = await fetch('http://localhost:5000/latest-tweets');
            const tweets = await response.json();
    
            tweetsContainer.innerHTML = '';
    
            if (tweets.length === 0) {
                tweetsContainer.innerHTML =
                    '<div class="tweet-item">No tweets available</div>';
                return;
            }
    
            tweets.forEach(tweet => {
                const div = document.createElement('div');
                div.className = 'tweet-item';
                div.textContent = tweet;
                tweetsContainer.appendChild(div);
            });
    
        } catch (err) {
            tweetsContainer.innerHTML =
                '<div class="tweet-item">Error loading tweets</div>';
            console.error(err);
        }
    });
    

    // Form validation on input
    textInput.addEventListener('input', function() {
        if (this.value.trim()) {
            this.style.borderColor = 'rgba(102, 126, 234, 0.3)';
        }
    });
});

