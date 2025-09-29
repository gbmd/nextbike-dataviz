import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = 3001;
const RESULTS_DIR = path.join(process.cwd(), 'quiz_results');

// Debugging log for results directory
console.log(`Results directory: ${RESULTS_DIR}`);

// Ensure the results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR);
    console.log('Results directory created.');
} else {
    console.log('Results directory already exists.');
}

// Middleware to parse JSON
app.use(express.json());

// Enable CORS
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'], // Allow specific HTTP methods
    allowedHeaders: ['Content-Type'], // Allow specific headers
}));

// Endpoint to save quiz results
app.post('/save-quiz', (req, res) => {
    const { fileName, answers } = req.body;

    if (!fileName || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    const timestamp = new Date().toISOString();
    const csvFilePath = path.join(RESULTS_DIR, fileName);
    const csvData = answers.map(answer => `${timestamp},${answer.join(',')}`).join('\n') + '\n';

    fs.appendFile(csvFilePath, csvData, (err) => {
        if (err) {
            console.error('Error saving quiz results:', err);
            return res.status(500).json({ error: 'Failed to save results' });
        }

        // Debugging log for saved file
        console.log(`Results saved to file: ${csvFilePath}`);
        res.status(200).json({ message: `Results saved successfully to ${fileName}` });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Micro-backend running on http://localhost:${PORT}`);
});
