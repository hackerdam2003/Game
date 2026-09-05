    (xhr) => {
        // Percentage ki jagah live MB/Bytes dikhayega taaki pata chale file aa rahi hai
        const mbLoaded = (xhr.loaded / (1024 * 1024)).toFixed(2);
        document.getElementById('loading-text').innerText = `Downloading Model... ${mbLoaded} MB`;
    },
