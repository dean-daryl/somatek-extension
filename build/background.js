chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'getImageUrl',
      title: 'Explain this Image',
      contexts: ['image'], // Show only when right-clicking an image
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'getImageUrl' && info.srcUrl) {
      chrome.action.openPopup();
      // When the user clicks on the context menu, send the image URL to the popup
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (imageUrl) => {
          setTimeout(() => {
            chrome.runtime.sendMessage({ url: imageUrl });
          }, 100)
        },
        args: [info.srcUrl] // Pass the image URL as an argument
      });
    }
  });