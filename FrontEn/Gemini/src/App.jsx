 
import React, { useState, useCallback } from 'react';
import './App.css';  

function App() {
    const [file, setFile] = useState(null);
    const [summary, setSummary] = useState('');
    
    const [summaryId, setSummaryId] = useState(null); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState(''); 
    const apiUrl = import.meta.env.VITE_API_URL;
   
    const allowedFileTypes = [
        "text/plain",
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"  
    ];
    const allowedExtensions = ['.txt', '.pdf', '.docx'];

     
    const handleFileChange = useCallback((event) => {
        const selectedFile = event.target.files[0];

        if (selectedFile) {
            const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
             
            if (allowedFileTypes.includes(selectedFile.type) || allowedExtensions.includes(fileExtension)) {
                setFile(selectedFile);
                setError('');  
            } else {
                setFile(null); 
                setError('Invalid file type. Please upload .txt, .pdf, or .docx');
            }
             
            setSummary('');
            setSummaryId(null);
            setMessage('');
        } else {
            
            setFile(null);
            setError('');
        }
        
        event.target.value = null;
    }, [allowedFileTypes, allowedExtensions]);  

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!file) {
            setError('Please select a file first.');
            return;
        }

        setIsLoading(true);
        setError('');
        setMessage('');
        setSummary('');
        setSummaryId(null);

        const formData = new FormData();
        formData.append('file', file); 

        try {
            const response = await fetch(`${apiUrl}/upload`, {  
                method: 'POST',
                body: formData,
                
            });

            const data = await response.json();  

            if (!response.ok) {
             
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

         
            setMessage(data.message || 'File processed successfully!');
            setSummary(data.summary || 'Summary generation might have failed or returned empty.');
            setSummaryId(data.summaryId || null);  

        } catch (err) {
            console.error("Submission error:", err);
             
            setError(err.message || 'An unexpected error occurred. Check browser console and backend logs.');
            setSummary('');  
            setSummaryId(null);
        } finally {
            setIsLoading(false);   
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>📄 File Summarizer with Gemini & MongoDB</h1>
                <p>Upload a .txt, .pdf, or .docx file to get an AI-powered summary.</p>
            </header>
            <main>
                <form onSubmit={handleSubmit} className="upload-form">
                    <div className="form-group">
                        <label htmlFor="file-upload" className="file-label">
                           {file ? `Selected: ${file.name}` : "Choose File..."}
                        </label>
                        <input
                            id="file-upload"
                            type="file"
                            accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileChange}
                            disabled={isLoading}
                            className="file-input"  
                        />
                    </div>
                    <button type="submit" disabled={isLoading || !file} className="submit-button">
                        {isLoading ? (
                            <>
                                <span className="spinner" /> Processing...
                            </>
                         ) : (
                             '✨ Summarize File'
                         )}
                    </button>
                </form>

              
                <div className="messages">
                    {error && <div className="message error-message">{error}</div>}
                    {message && !error && <div className="message success-message">{message}</div>}
                    
                    {summaryId && !error && <div className="message info-message">Summary saved with ID: {summaryId}</div>}
                </div>


                {summary && !error && (
                    <div className="result-section summary-section">
                        <h2>Generated Summary:</h2>
                        <pre className="summary-text">{summary}</pre>
                    </div>
                )}

                

            </main>
            <footer className="App-footer">
                This is created using React,Express, Node.js, Gemini AI, and MongoDB
            </footer>
        </div>
    );
}

export default App;