// All selectors used by the extension
const SELECTORS = {
  homeFeed: `
    .feed-shared-update-v2,
    .scaffold-finite-scroll__content,
    button[class*="artdeco-button--secondary"][class*="scaffold-finite-scroll"],
    div[class*="sort-dropdown"],
    div[class="display-flex p5"],
    button[class*="artdeco-dropdown__trigger"],
    .feed-shared-update-v2__description-wrapper,
    .artdeco-dropdown__trigger--placement-bottom,
    .feed-index-sort-border,
    button[aria-expanded][id^="ember"][class*="artdeco-dropdown__trigger"],
    .artdeco-dropdown.mb2[id^="ember"],
    div[class="artdeco-dropdown artdeco-dropdown--placement-bottom artdeco-dropdown--justification-right ember-view"],
    button[class*="artdeco-dropdown__trigger"][class*="full-width"][class*="display-flex"]
  `,
  rightSidebar: ".scaffold-layout__aside",
  leftSidebar: ".scaffold-layout__sidebar, .profile-rail-card",
  engagementSection: ".social-details-social-counts",
  notificationCount: ".notification-badge",
  messagingSection: ".msg-overlay-list-bubble",
  globalNav: "#global-nav",
  zenModeExclude: ".share-box-feed-entry__content",
  // Commenting out promoted and ads selectors to preserve other features
   promotedAndAds: `
    .ad-banner-container,
    a[class*="update-components"][class*="sub-description-link"][aria-label="Promoted"],
    div[class*="feed-shared-update-v2"]:has(a[aria-label="Promoted"]),
    .update-components-actor__description:has(a[aria-label="Promoted"])
  `, 
  mediaContent: `
    /* Articles with images */
    .update-components-article,
    .update-components-article__image-link,
    .update-components-article--with-large-image,
    .update-components-article__description-container,
    
    /* Videos */
    .ember-view.video-js,
    [data-vjs-player],
    .vjs-tech,
    .media-player__player,
    .video-main-container,
    
    /* Documents/Carousel */
    .update-components-document__container,
    .document-s-container,
    .carousel-container,
    
    /* General media containers */
    .feed-shared-update-v2__content img,
    .feed-shared-update-v2__content video,
    .feed-shared-image__container,
    .feed-shared-video__container,
    .feed-shared-linkedin-video__container,
    .feed-shared-external-video__container,
    .feed-shared-carousel__content,
    .feed-shared-article__preview-container,
    .update-components-image,
    .video-container,
    
    /* Additional containers */
    .feed-shared-update-v2__content .update-components-image,
    .feed-shared-update-v2__content .update-components-video,
    .feed-shared-update-v2__content .update-components-document,
    div[class*="feed-shared"][class*="image"],
    div[class*="feed-shared"][class*="video"],
    div[class*="feed-shared"][class*="document"]
  `,
};

const NAVBAR_SELECTORS = {
  hideHomeIcon: ".global-nav__primary-items > li:nth-child(1)",
  hideNetworkIcon: ".global-nav__primary-items > li:nth-child(2)",
  hideJobsIcon: ".global-nav__primary-items > li:nth-child(3)",
  hideMessagingIcon: ".global-nav__primary-items > li:nth-child(4)",
  hideNotificationsIcon: ".global-nav__primary-items > li:nth-child(5)",
  hideMeIcon: ".global-nav__primary-items > li:nth-child(6)",
  hideBusinessIcon: ".global-nav__primary-items > li:nth-child(7)",
};

// Keep track of active observers
let observers = new Map();
let zenModeActive = false;

// Function to hide elements
function hideElements(selector) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((element) => {
    if (element) {
      element.style.display = "none";
    }
  });
}

// Function to show elements
function showElements(selector) {
  const elements = document.querySelectorAll(selector);
  elements.forEach((element) => {
    if (element) {
      element.style.display = "";
    }
  });
}

// Function to handle navbar icon visibility
function toggleNavbarIcon(iconType, hidden) {
  const selector = NAVBAR_SELECTORS[iconType];
  if (selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.style.display = hidden ? "none" : "";
      // Save the state
      chrome.storage.sync.set({
        [iconType + "Hidden"]: hidden,
      });
    }
  }
}

// Function to handle media content
function handleMediaContent(mutations) {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        // Find and hide all media elements
        const mediaElements = node.querySelectorAll(SELECTORS.mediaContent);
        mediaElements.forEach((element) => {
          element.style.display = "none";

          let parent = element.parentElement;
          while (
            parent &&
            !parent.classList.contains("feed-shared-update-v2")
          ) {
            if (
              parent.classList.contains("update-components-article") ||
              parent.classList.contains("document-s-container") ||
              parent.classList.contains("video-js") ||
              parent.classList.contains("update-components-image") ||
              parent.classList.contains("update-components-video") ||
              parent.classList.contains("update-components-document")
            ) {
              parent.style.display = "none";
            }
            parent = parent.parentElement;
          }
        });

        const videoPlayers = node.querySelectorAll(
          "[data-vjs-player], .video-js"
        );
        videoPlayers.forEach((player) => {
          player.style.display = "none";
          const parentContainer = player.closest(
            ".feed-shared-update-v2__content"
          );
          if (parentContainer) {
            const mediaWrapper =
              parentContainer.querySelector(".video-container");
            if (mediaWrapper) {
              mediaWrapper.style.display = "none";
            }
          }
        });
      }
    });
  });
}

// Function to apply Zen Mode
function applyZenMode() {
  const excludeSelectors = Object.keys(SELECTORS)
    .filter((key) => key !== "zenModeExclude" && key !== "globalNav")
    .map((key) => SELECTORS[key])
    .join(", ");

  hideElements(excludeSelectors);
  hideElements(SELECTORS.globalNav);

  // Remove any existing zen mode styles first
  const existingStyle = document.getElementById("zen-mode-styles");
  if (existingStyle) {
    existingStyle.remove();
  }

  // Add zen mode styles
  const style = document.createElement("style");
  style.id = "zen-mode-styles";
  style.textContent = `
    .artdeco-hoverable-content {
      display: none !important;
    }
    .share-box-feed-entry__content {
      border: 3px solid orange !important;
      border-radius: 8px !important;
      padding: 10px !important;
      margin: 10px !important;
      background-color: white !important;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important;
    }
  `;
  document.head.appendChild(style);
}

// Function to remove Zen Mode
function removeZenMode() {
  const style = document.getElementById("zen-mode-styles");
  if (style) {
    style.remove();
  }

  Object.keys(SELECTORS)
    .filter((key) => key !== "zenModeExclude" && key !== "globalNav")
    .forEach((key) => {
      showElements(SELECTORS[key]);
    });

  showElements(SELECTORS.globalNav);
}

// Function to start observing changes
function startObserving(featureType) {
  stopObserving(featureType);

  const targetNode = document.body;
  const config = { childList: true, subtree: true };

  const observer = new MutationObserver(function (mutations) {
    if (featureType === "zenMode") {
      applyZenMode();
    } else if (featureType === "mediaContent") {
      handleMediaContent(mutations);
      hideElements(SELECTORS.mediaContent);
    } else {
      mutations.forEach(function (mutation) {
        if (mutation.type === "childList") {
          hideElements(SELECTORS[featureType]);
        }
      });
    }
  });

  observer.observe(targetNode, config);
  observers.set(featureType, observer);
}

// Function to stop observing changes
function stopObserving(featureType) {
  const observer = observers.get(featureType);
  if (observer) {
    observer.disconnect();
    observers.delete(featureType);
  }
}

// Initialize media content hiding
function initializeMediaContent() {
  hideElements(SELECTORS.mediaContent);
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.type === "toggleElement") {
      const { elementType, hidden } = request;

      // Handle navbar icon toggles
      if (elementType.startsWith("hide") && elementType.endsWith("Icon")) {
        toggleNavbarIcon(elementType, hidden);
        return;
      }

      if (elementType === "zenMode") {
        zenModeActive = hidden;
        if (hidden) {
          startObserving("zenMode");
          applyZenMode();
        } else {
          stopObserving("zenMode");
          removeZenMode();
        }
      } else if (elementType === "mediaContent") {
        if (hidden) {
          startObserving("mediaContent");
          initializeMediaContent();
        } else {
          stopObserving("mediaContent");
          showElements(SELECTORS.mediaContent);
        }
      } else {
        if (hidden) {
          startObserving(elementType);
          hideElements(SELECTORS[elementType]);
        } else {
          stopObserving(elementType);
          showElements(SELECTORS[elementType]);
        }
      }
    } else if (request.type === "resetAll") {
      observers.forEach((observer, type) => {
        stopObserving(type);
      });

      if (zenModeActive) {
        removeZenMode();
        zenModeActive = false;
      }

      // Show all navbar icons
      Object.keys(NAVBAR_SELECTORS).forEach((iconType) => {
        showElements(NAVBAR_SELECTORS[iconType]);
      });

      Object.values(SELECTORS).forEach((selector) => {
        showElements(selector);
      });
    }
  } catch (error) {
    console.error("Extension error:", error);
    chrome.runtime.sendMessage({
      type: "ERROR",
      details: {
        message: error.message,
        stack: error.stack,
      },
    });
  }
});

// Update the chrome.storage.sync.get section at the bottom of the file
chrome.storage.sync.get(null, (settings) => {
  if (settings.extensionEnabledHidden !== false) {
    // First check and apply Zen Mode if enabled
    if (settings.zenModeHidden === true) {
      zenModeActive = true;
      applyZenMode();
      startObserving("zenMode");
    }

    // Then handle other settings
    Object.keys(settings).forEach((key) => {
      if (key.endsWith("Hidden") && settings[key] === true && key !== "zenModeHidden") {
        const elementType = key.replace("Hidden", "");

        // Handle navbar icons
        if (NAVBAR_SELECTORS[elementType]) {
          toggleNavbarIcon(elementType, true);
        } else if (SELECTORS[elementType]) {
          if (elementType === "mediaContent") {
            startObserving("mediaContent");
            initializeMediaContent();
          } else {
            startObserving(elementType);
            hideElements(SELECTORS[elementType]);
          }
        }
      }
    });
  }
});

// Add a new listener for page visibility changes
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    chrome.storage.sync.get("zenModeHidden", (settings) => {
      if (settings.zenModeHidden === true && !zenModeActive) {
        zenModeActive = true;
        applyZenMode();
        startObserving("zenMode");
      }
    });
  }
});
