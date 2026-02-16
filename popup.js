document.getElementById('startBtn').addEventListener('click', async () => {
    const text = document.getElementById('answerList').value;
    // Split by new line and remove empty lines
    const answers = text.split('\n').map(a => a.trim()).filter(a => a !== "");
    const status = document.getElementById('status');

    if (answers.length === 0) {
        status.innerText = "Error: No answers provided!";
        status.style.color = "#ff4d4d";
        return;
    }

    status.innerText = "Running... Processing 20 Questions";
    status.style.color = "#ffd700";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: runAutomationLoop,
        args: [answers]
    });
});

async function runAutomationLoop(answerArray) {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Limits to 20 questions as requested
    const totalQuestions = Math.min(answerArray.length, 20);

    for (let i = 0; i < totalQuestions; i++) {
        const currentAnswer = answerArray[i];
        console.log(`Step ${i+1}: Locating "${currentAnswer}"`);

        // --- STEP 1: FIND AND CLICK THE ANSWER ---
        let answerClicked = false;
        // Search deep for any element containing the text
        const elements = document.querySelectorAll('label, button, span, p, div, li, input[type="radio"]');
        
        for (let el of elements) {
            // Check innerText or value for a match
            const content = (el.innerText || el.value || "").trim().toLowerCase();
            if (content === currentAnswer.toLowerCase()) {
                el.click();
                
                // Trigger an extra click on any radio button inside or near this element
                const radio = el.querySelector('input[type="radio"]') || 
                              el.closest('div')?.querySelector('input[type="radio"]') ||
                              document.getElementById(el.getAttribute('for'));
                if (radio) radio.click();

                answerClicked = true;
                break;
            }
        }

        if (!answerClicked) {
            console.warn(`Warning: Could not find element matching "${currentAnswer}"`);
        }

        // Wait 1.5 seconds for the click to process
        await sleep(1500); 

        // --- STEP 2: FIND AND CLICK THE "NEXT" BUTTON ---
        const navSelectors = [
            'button', 'input[type="button"]', 'input[type="submit"]', 
            'a.btn', 'div[role="button"]', '.next-button', '#next-btn'
        ];
        
        let nextBtnFound = false;
        const navButtons = document.querySelectorAll(navSelectors.join(','));

        for (let btn of navButtons) {
            const btnText = (btn.innerText || btn.value || btn.getAttribute('aria-label') || "").toLowerCase();
            const btnId = (btn.id || "").toLowerCase();

            // Match "Next", "Continue", "Forward", or common arrow symbols
            if (btnText.includes('next') || 
                btnText.includes('cont') || 
                btnText.includes('forward') || 
                btnText.includes('→') ||
                btnId.includes('next')) {
                
                // Do NOT click "Submit" automatically on the 20th question
                if (btnText.includes('submit') && i === totalQuestions - 1) {
                    console.log("Last question reached. Stopping before Submit.");
                    nextBtnFound = true; // Mark as found so we don't trigger warning
                    break;
                }

                btn.click();
                nextBtnFound = true;
                break;
            }
        }

        if (!nextBtnFound && i < totalQuestions - 1) {
            console.error("Could not find the 'Next' button automatically.");
        }

        // Wait 3 seconds for the next page/AJAX to load
        await sleep(3000); 
    }
    
    alert("Automation Finished 20 Questions!\n\nPlease review your answers and click Submit manually.");
}