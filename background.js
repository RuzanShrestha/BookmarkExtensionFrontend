// AI-powered getCategory function
async function getCategory(bookmark) {
    try {
        const response = await fetch("https://bookmark-extension-server.onrender.com/categorize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: bookmark.title,
                url: bookmark.url
            })
        });

        const data = await response.json();
        return data.category || "Uncategorized";
    } catch (err) {
        console.error("AI categorization failed, using fallback:", err);
        return "Uncategorized";
    }
}

// When a bookmark is created in Chrome
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
    await categorizeBookmark(bookmark);
});

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "recategorize_bulk" && message.bookmarks) {
        chrome.storage.local.get({ categorizedBookmarks: {} }, async (data) => {
            let categorizedBookmarks = data.categorizedBookmarks;

            for (const bookmark of message.bookmarks) {
                const category = await getCategory(bookmark);
                if (!categorizedBookmarks[category]) {
                    categorizedBookmarks[category] = [];
                }

                const exists = categorizedBookmarks[category].some(b => b.url === bookmark.url);
                if (!exists) {
                    categorizedBookmarks[category].push({
                        title: bookmark.title,
                        url: bookmark.url
                    });
                }
            }

            chrome.storage.local.set({ categorizedBookmarks }, () => {
                console.log("All bookmarks saved via bulk recategorization.");
                sendResponse({ success: true });
            });
        });

        return true; // Keep message channel open for async response
    }

    if (message.action === "recategorize" && message.bookmark) {
        categorizeBookmark(message.bookmark);
    }
});

// Categorize a single bookmark and store it
async function categorizeBookmark(bookmark) {
    chrome.storage.local.get({ categorizedBookmarks: {} }, async (data) => {
        let categorizedBookmarks = data.categorizedBookmarks;
        const category = await getCategory(bookmark);

        if (!categorizedBookmarks[category]) {
            categorizedBookmarks[category] = [];
        }

        const exists = categorizedBookmarks[category].some(b => b.url === bookmark.url);
        if (!exists) {
            categorizedBookmarks[category].push({
                title: bookmark.title,
                url: bookmark.url
            });

            chrome.storage.local.set({ categorizedBookmarks }, () => {
                console.log(`Saved "${bookmark.title}" under category "${category}"`);
            });
        }
    });
}
