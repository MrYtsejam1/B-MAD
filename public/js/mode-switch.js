document.addEventListener('DOMContentLoaded', function() {
    console.log('Mode switch initialized - Advanced mode only');
    
    // Advanced mode is always active - no mode switching needed
    const advancedModeButtons = document.getElementById('advancedModeButtons');
    const agentStreamContainer = document.getElementById('agentStreamContainer');

    // Ensure advanced mode UI is visible
    if (advancedModeButtons) {
        advancedModeButtons.style.display = 'block';
    }
    if (agentStreamContainer) {
        agentStreamContainer.style.display = 'block';
    }
    
    console.log('✓ Advanced mode activated');

    fetch('/version')
        .then(res => res.json())
        .then(data => {
            const versionFooter = document.getElementById('versionFooter');
            if (versionFooter) {
                versionFooter.textContent = 
                    `Version: ${data.version} | Sprints: ${data.sprints} | ${new Date(data.timestamp).toLocaleString()}`;
            }
        })
        .catch(() => {
            const versionFooter = document.getElementById('versionFooter');
            if (versionFooter) {
                versionFooter.textContent = 'Version: dev';
            }
        });
});
