document.getElementById('startBtn').addEventListener('click', async () => {

    const text = document.getElementById('answerList').value;
    const answers = text
        .split('\n')
        .map(a => a.trim())
        .filter(a => a !== "");

    const status = document.getElementById('status');

    if (answers.length === 0) {
        status.innerText = "Error: No answers provided!";
        status.style.color = "#ff4d4d";
        return;
    }

    status.innerText = "Running in background...";
    status.style.color = "#ffd700";

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });

    chrome.runtime.sendMessage({
        action: "startAutomation",
        tabId: tab.id,
        answers: answers
    });

    window.close(); // Close popup safely
});
