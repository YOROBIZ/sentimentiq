/**
 * AI Logic Processor - insight-ai-pro
 * Orchestrates the Python AI script.
 */

class AIProcessor {
    /**
     * Spawns a Python process to analyze the text.
     * @param {string} text 
     * @returns {Promise<object>} Result of the analysis
     */
    async analyzeFeedback(text) {
        return new Promise((resolve, reject) => {
            const { spawn } = require('child_process');
            const path = require('path');

            // Chemin vers le script Python
            const pythonScript = path.join(__dirname, 'analyzer.py');

            // Lancer le processus Python
            // Utilisation du lanceur 'py' car 'python' n'est pas dans le PATH
            const pythonProcess = spawn('py', [pythonScript, text]);

            let dataString = '';

            pythonProcess.stdout.on('data', (data) => {
                dataString += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                console.error(`Python Error: ${data}`);
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    console.log(`Python script exited with code ${code}`);
                    // Fallback en cas de pépin
                    resolve({ sentiment: 'NEUTRAL', confidence: 0.5, keyPhrases: 'Erreur Analyse' });
                } else {
                    try {
                        const result = JSON.parse(dataString);
                        resolve(result);
                    } catch (e) {
                        resolve({ sentiment: 'NEUTRAL', confidence: 0.5, keyPhrases: 'Erreur Parsing' });
                    }
                }
            });
        });
    }
}

module.exports = new AIProcessor();
