const apiUrl = "https://deckdetectextended-319785774133.europe-west1.run.app";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to show a loading spinner
function showLoadingSpinner(container, message = "Loading...") {
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

// Function to hide the spinner and clear the container
function hideLoadingSpinner(container) {
  container.innerHTML = "";
}

// Function to show a specific section
function showSection(sectionId, clickedButton) {
  // Hide all sections
  const sections = document.querySelectorAll(".content-section");
  sections.forEach((section) => section.classList.remove("active"));

  // Show the selected section
  document.getElementById(sectionId).classList.add("active");

  // Remove "selected" class from all buttons
  const buttons = document.querySelectorAll(".nav-button");
  buttons.forEach((button) => button.classList.remove("selected"));

  // Add "selected" class to the clicked button
  clickedButton.classList.add("selected");

  // Determine which data to fetch based on the section clicked
  if (sectionId === "similar") {
    fetchAndRenderCards(
      // `mock_responses/from_beyond_similar_cards.json`,
      "get_similar_cards",
      "card-similar"
    );
  } else if (sectionId === "counters") {
    fetchAndRenderCards(
      // `mock_responses/from_beyond_counter_cards.json`,
      "get_counter_cards",
      "card-counter"
    );
  }
}

// Async function to fetch cards and render them
async function fetchAndRenderCards(apiEndpoint, containerId) {
  const container = document.getElementById(containerId);
  showLoadingSpinner(container, "Loading...");

  try {
    await sleep(2000);
    // Make API call

    const cardData = JSON.parse(localStorage.getItem("uploadResult"));
    const cardName = cardData.name;

    const response = await fetch(`${apiUrl}/${apiEndpoint}/${cardName}`);
    if (!response.ok) {
      throw new Error("Failed to fetch cards.");
    }

    const cards = await response.json(); // Parse JSON response
    hideLoadingSpinner(container);
    container.innerHTML = ""; // Clear the loading message
    renderCards(cards, container); // Render the fetched cards
  } catch (error) {
    console.error("Error fetching cards:", error);
    container.innerHTML = "<p>Failed to load cards.</p>";
  }
}

// Function to render cards dynamically
function renderCards(cards, container) {
  container.innerHTML = ""; // Clear previous content
  cards.slice(0, 3).forEach((card) => {
    const imgElement = document.createElement("img");
    imgElement.src = card.image_uri_normal; // Set the image source
    imgElement.alt = card.name; // Set alt text
    imgElement.style.margin = "10px";
    imgElement.style.width = "150px"; // Optional fixed width for images

    const cardName = document.createElement("p");
    cardName.textContent = card.name;

    const cardContainer = document.createElement("div");
    cardContainer.className = "card";
    cardContainer.style.textAlign = "center";
    cardContainer.style.margin = "10px";

    cardContainer.appendChild(imgElement);
    cardContainer.appendChild(cardName);
    container.appendChild(cardContainer);
  });
}

let cropper;
let croppedBlob;

// Handle dynamic button click (Upload Card or Submit Image)
function handleUploadButtonClick() {
  const fileInput = document.getElementById("card-upload");
  const button = document.getElementById("dynamic-button");
  const cropperContainer = document.querySelector(".image-preview-container");

  if (button.innerText === "Upload Card") {
    fileInput.click();

    fileInput.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const imagePreview = document.getElementById("image-preview");
      cropperContainer.style.display = "flex"; // Ensure the container becomes visible

      // Load and display the image for cropping
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;

        // Initialize Cropper.js
        if (cropper) cropper.destroy();
        cropper = new Cropper(imagePreview, {
          aspectRatio: 5 / 7,
          viewMode: 1,
        });

        // Change button state
        button.innerText = "Submit Image";
      };
      reader.readAsDataURL(file);
    };
  } else if (button.innerText === "Submit Image") {
    if (!cropper) return alert("Please crop the image first!");

    cropper.getCroppedCanvas().toBlob(async (blob) => {
      if (!blob) return alert("Failed to process the cropped image.");

      // Hide cropper container and show the upload placeholder
      cropperContainer.style.display = "none";
      const resultsBackground = document.querySelector(".results-background");
      const indexBackground = document.querySelector(".index-background");

      // Apply blur effect
      if (resultsBackground) resultsBackground.classList.add("blurred");
      if (indexBackground) indexBackground.classList.add("blurred");

      const unpackAnimation = document.getElementById(
        "unpack-animation-placeholder"
      );

      unpackAnimation.innerHTML = `
        <video id="loading-animation" autoplay style="max-width: 100%; height: auto; background: transparent;">
          <source src="assets/card_unpack_just_cards.webm" type="video/webm">
          Your browser does not support the video tag.
        </video>
        <div id="spinner" style="display: none;">
          <div class="spinner"></div>
          <p>Uploading... Please wait.</p>
        </div>
      `;

      // Reference the video element directly
      const videoElement = document.getElementById("loading-animation");

      // Add an event listener for the 'ended' event to the video element
      videoElement.addEventListener("ended", () => {
        // Hide the video element
        videoElement.style.display = "none";

        // Show the spinner
        const container = document.getElementById(
          "unpack-animation-placeholder"
        );
        showLoadingSpinner(container, "Loading...");
      });

      try {
        // Construct FormData with the cropped image blob
        const formData = new FormData();
        formData.append("image", blob, "cropped-image.png");

        const response = await fetch(`${apiUrl}/process_card`, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "*/*",
          },
        });

        if (response.ok) {
          const result = await response.json();

          if (resultsBackground) resultsBackground.classList.remove("blurred");
          if (indexBackground) indexBackground.classList.remove("blurred");

          localStorage.setItem("uploadResult", JSON.stringify(result));
          window.location.href = "results.html";
        } else {
          alert("Upload failed. Please try again.");
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        alert("An error occurred during upload.");
      }
    }, "image/png"); // Ensure image is processed as PNG
  }
}

// When results.html loads, display the card details
document.addEventListener("DOMContentLoaded", () => {
  // Retrieve card data from localStorage
  const cardData = JSON.parse(localStorage.getItem("uploadResult"));

  if (!cardData) {
    console.error("No card data found!");
    return;
  }

  // Set the card image
  const cardImage = document.getElementById("user-card-image");
  if (cardImage) {
    cardImage.src = cardData.image_uri_normal;
    cardImage.alt = cardData.name;
  }

  // Update the card details
  const cardDetails = document.getElementById("card-details");
  if (cardDetails) {
    cardDetails.innerHTML = `
      <p><strong>Name:</strong> ${cardData.name}</p>
      <p><strong>Set:</strong> ${cardData.set}</p>
      <p><strong>Oracle Text:</strong> ${cardData.oracle_text}</p>
      <p><strong>Price (USD):</strong> $${cardData.price_usd}</p>
    `;
  }

  // Update the price graph
  const priceGraph = document.getElementById("price-graph");
  if (priceGraph) {
    try {
      // Parse the nested JSON string
      const nestedData = JSON.parse(cardData.price_history_plot);
      const base64Image = nestedData.price;

      // Create and append the image
      const img = new Image();
      img.src = `data:image/png;base64,${base64Image}`;
      img.alt = "Price History Graph";

      priceGraph.appendChild(img);
    } catch (error) {
      console.error("Error parsing price history plot:", error);
    }
  }
});

// Select the title element
const title = document.getElementById("deckdetect-title");

// Add click event listener
title.addEventListener("click", () => {
  // Trigger the confetti effect
  confetti({
    particleCount: 100, // Number of particles
    startVelocity: 30, // Speed of particles
    spread: 360, // Spread angle
    origin: { x: 0.5, y: 0.3 }, // Start at the center-top
    colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"], // Custom colors
  });
});
