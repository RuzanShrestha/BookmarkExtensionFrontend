document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get("categorizedBookmarks", (data) => {
        let bookmarks = data.categorizedBookmarks || {};
        console.log("Loaded categorizedBookmarks from storage:", bookmarks);
        
        let bookmarkList = document.getElementById("bookmarkList");
        bookmarkList.innerHTML = "";

        for (let category in bookmarks) {
            console.log("Category:", category, bookmarks[category]);

            // Add category heading
            let section = document.createElement("div");
            section.classList.add("category");
            section.innerText = category;
            bookmarkList.appendChild(section);

            bookmarks[category].forEach((bookmark) => {
                if (!bookmark.title || !bookmark.url) {
                    console.warn("Skipping invalid bookmark:", bookmark);
                    return;
                }

                console.log("Rendering bookmark:", bookmark);

                let container = document.createElement("div");
                container.classList.add("bookmark-item");

                let link = document.createElement("a");
                link.href = bookmark.url;
                link.innerText = bookmark.title;
                link.target = "_blank";

                let deleteBtn = document.createElement("button");
                deleteBtn.innerHTML = "&times;";
                deleteBtn.classList.add("delete-btn");

                deleteBtn.onclick = () => {
                    chrome.storage.local.get("categorizedBookmarks", (updatedData) => {
                        let updatedBookmarks = updatedData.categorizedBookmarks || {};
                        if (updatedBookmarks[category]) {
                            updatedBookmarks[category] = updatedBookmarks[category].filter(
                                b => b.url !== bookmark.url
                            );

                            if (updatedBookmarks[category].length === 0) {
                                delete updatedBookmarks[category];
                            }

                            chrome.storage.local.set({ categorizedBookmarks: updatedBookmarks }, () => {
                                renderBookmarks();
                            });
                        }
                    });
                };

                container.appendChild(link);
                container.appendChild(deleteBtn);
                bookmarkList.appendChild(container);
            });
        }
    });

    document.getElementById("resetBtn").addEventListener("click", () => {
        if (confirm("Are you sure you want to reset and recategorize all bookmarks?")) {
            chrome.storage.local.set({ categorizedBookmarks: {} }, () => {
                chrome.bookmarks.getTree((bookmarkTreeNodes) => {
                    let flatList = [];
    
                    const flatten = (nodes) => {
                        for (let node of nodes) {
                            if (node.url) flatList.push(node);
                            if (node.children) flatten(node.children);
                        }
                    };
                    flatten(bookmarkTreeNodes);
    
                    // Send one message with all bookmarks
                    chrome.runtime.sendMessage({
                        action: "recategorize_bulk",
                        bookmarks: flatList
                    }, () => {
                        // Wait for background to finish writing
                        setTimeout(() => {
                            renderBookmarks();
                        }, 500);
                    });
                });
            });
        }
    });
    

    function renderBookmarks() {
        window.location.reload();
    }
});
