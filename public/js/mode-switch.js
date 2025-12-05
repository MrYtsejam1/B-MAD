document.addEventListener('DOMContentLoaded', function() {
    console.log('Mode switch initialized');
    
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const simpleModeButtons = document.getElementById('simpleModeButtons');
    const advancedModeButtons = document.getElementById('advancedModeButtons');
    const agentStreamContainer = document.getElementById('agentStreamContainer');
    const result = document.getElementById('result');
    const mcpServerGroup = document.getElementById('mcpServerGroup');

    function switchMode() {
        const selectedMode = document.querySelector('input[name="mode"]:checked').value;
        console.log('Switching to mode:', selectedMode);
        
        if (selectedMode === 'simple') {
            simpleModeButtons.style.display = 'block';
            advancedModeButtons.style.display = 'none';
            agentStreamContainer.style.display = 'none';
            mcpServerGroup.style.display = 'none';
            result.style.display = 'block';
            console.log('✓ Simple mode activated');
        } else {
            simpleModeButtons.style.display = 'none';
            advancedModeButtons.style.display = 'block';
            agentStreamContainer.style.display = 'block';
            mcpServerGroup.style.display = 'block';
            result.style.display = 'none';
            console.log('✓ Advanced mode activated');
        }
    }

    modeRadios.forEach(radio => {
        radio.addEventListener('change', switchMode);
    });

    switchMode();

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
