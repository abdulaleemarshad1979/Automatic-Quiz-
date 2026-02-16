document.getElementById('startBtn').addEventListener('click', async () => {
    const text = document.getElementById('answerList').value.trim();
    const answers = text.split('\n').map(a => a.trim()).filter(a => a !== "");
    
    // Get speed multiplier from input (default 10 if not specified)
    const speedMultiplier = parseInt(document.getElementById('speedInput')?.value || 10);

    if (!answers.length) {
        document.getElementById('status').textContent = 'Status: No answers provided!';
        return;
    }

    document.getElementById('status').textContent = `Status: Starting with ${speedMultiplier}x speed...`;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 1. FIRST: Inject Time Warp into MAIN world BEFORE automation starts
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: (speedMultiplier) => {
            // Store originals
            const originalSI = window.setInterval;
            const originalST = window.setTimeout;
            const originalDate = window.Date;

            // Override immediately
            window.setInterval = function(cb, delay, ...args) {
                return originalSI.call(this, cb, Math.max(1, delay / speedMultiplier), ...args);
            };

            window.setTimeout = function(cb, delay, ...args) {
                return originalST.call(this, cb, Math.max(1, delay / speedMultiplier), ...args);
            };

            // Override Date for animations that use Date.now()
            window.Date = class extends originalDate {
                constructor(...args) {
                    if (args.length === 0) {
                        super(originalDate.now() * speedMultiplier);
                    } else {
                        super(...args);
                    }
                }
                static now() {
                    return originalDate.now() * speedMultiplier;
                }
            };

            // Intercept requestAnimationFrame for even smoother speedup
            const originalRAF = window.requestAnimationFrame;
            let timeOffset = 0;
            window.requestAnimationFrame = function(callback) {
                return originalRAF.call(this, (time) => {
                    timeOffset += (speedMultiplier - 1) * 16; // Accelerate frame time
                    callback(time + timeOffset);
                });
            };

            console.log(`⚡ Time Warp: ${speedMultiplier}x speed activated in MAIN world`);
        },
        args: [speedMultiplier]
    });

    // 2. Small delay to ensure override is active
    await new Promise(resolve => setTimeout(resolve, 100));

    document.getElementById('status').textContent = 'Status: Running automation...';

    // 3. Now run the automation
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: runAutomationLoop,
        args: [answers]
    });

    document.getElementById('status').textContent = 'Status: Complete! ✓';

    setTimeout(() => window.close(), 500);
});

async function runAutomationLoop(answerArray) {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const totalQuestions = Math.min(answerArray.length, 20);

    for (let i = 0; i < totalQuestions; i++) {
        const goal = answerArray[i].toLowerCase().replace(/\s/g, '').replace(/rs|kg|years|yrs|\./g, '');
        const elements = document.querySelectorAll('label, span, p, div, .answer, button');

        let clicked = false;
        for (let el of elements) {
            const content = (el.innerText || "").toLowerCase().replace(/\s/g, '').replace(/rs|kg|years|yrs|\./g, '');
            if (content === goal || (goal.includes('/') && content.includes(goal))) {
                const radio = el.querySelector('input[type="radio"]') || 
                             el.closest('label')?.querySelector('input[type="radio"]') ||
                             el.closest('div')?.querySelector('input[type="radio"]');
                
                if (radio) {
                    radio.click();
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                    radio.dispatchEvent(new Event('input', { bubbles: true }));
                    clicked = true;
                    break;
                }
            }
        }

        if (!clicked) {
            console.warn(`Question ${i + 1}: Could not find answer "${answerArray[i]}"`);
        }

        await sleep(500);

        // Click next button
        if (i < totalQuestions - 1) {
            const navButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
            for (let btn of navButtons) {
                const btnText = (btn.innerText || btn.value || btn.getAttribute('aria-label') || "").toLowerCase().trim();
                if (['next', 'continue', 'save & next', 'save and next', '→', 'submit'].some(word => btnText.includes(word))) {
                    btn.click();
                    console.log(`Clicked: ${btnText}`);
                    break;
                }
            }
            await sleep(200); // Give page time to load next question
        }
    }

    // No alert - automation completes silently
    console.log("✅ Automation complete! Timers are running at accelerated speed.");
}

