 
const { geminiModel, generationConfig } = require("../config/gemini");  

 
const ongoingRequests = new Map();

async function summarizeWithGemini(textToSummarize, contentHash) {
  if (!textToSummarize || textToSummarize.trim().length < 30) {
     console.log("Text too short for summarization, returning as is.");
     return "Input text is too short to generate a meaningful summary.";
  }

  if (ongoingRequests.has(contentHash)) {
    console.log(`Request for hash ${contentHash.substring(0,8)}... already in progress. Waiting...`);
    return ongoingRequests.get(contentHash);
  }

  const prompt = `Provide a concise, well-structured summary of the following text. Focus on the key points and main ideas. Output only the summary text.

TEXT:
"""
${textToSummarize.substring(0, 100000)}
"""

SUMMARY:`;

  console.log(
    `Sending text (hash: ${contentHash.substring(0,8)}..., length: ${textToSummarize.length}) to Gemini...`
  );

  const apiCallPromise = (async () => {
      try {
       
        const result = await geminiModel.generateContent(
            { contents: [{ role: "user", parts: [{ text: prompt }] }] },
             generationConfig  
        );

        if (!result || !result.response) {
            throw new Error("Invalid response structure received from Gemini.");
        }
        const response = result.response;

        const promptFeedback = response.promptFeedback;
        if (promptFeedback?.blockReason) {
          console.warn(`Gemini request blocked. Reason: ${promptFeedback.blockReason}`, promptFeedback);
          throw new Error(
            `Summarization blocked due to safety filters: ${promptFeedback.blockReason}. ${promptFeedback.blockReasonMessage || ''}`
          );
        }

        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content?.parts?.[0]?.text) {
             console.warn("Gemini returned no valid summary text. Full response:", JSON.stringify(response, null, 2));
             const finishReason = response.candidates?.[0]?.finishReason;
             if(finishReason && finishReason !== 'STOP'){
                 throw new Error(`Summarization failed. Reason: ${finishReason}`);
             }
             throw new Error(
                "Failed to generate summary (no text found in response candidates)."
            );
        }

        const summaryText = response.candidates[0].content.parts[0].text;

        if (!summaryText || summaryText.trim().length === 0) {
          console.warn("Gemini returned an empty summary string.");
          throw new Error(
            "Failed to generate summary (received empty string)."
          );
        }

        console.log(`Summary received from Gemini for hash ${contentHash.substring(0,8)}...`);
        return summaryText.trim();
      } catch (error) {
        console.error(`Error calling Gemini API for hash ${contentHash.substring(0,8)}...:`, error);
        let errorMessage = "An error occurred while communicating with the summarization service.";
        if (error.message.includes("SAFETY") || error.message.includes("blocked due to safety")) {
          errorMessage = error.message;
        } else if (error.message.includes("quota") || error.message.includes("limit") || error.response?.status === 429) {
          errorMessage = "API usage limit reached or rate limit exceeded. Please check your quota or try again later.";
        } else if (error.message.includes("API key not valid")) {
          errorMessage = "Invalid API Key configured for the summarization service.";
        } else if (error.response?.status === 400) {
             errorMessage = `Invalid request sent to summarization service. ${error.message}`;
        } else if (error.message.includes("Failed to generate summary")) {
             errorMessage = error.message;
        }
        throw new Error(errorMessage);
      } finally {
          ongoingRequests.delete(contentHash);
          console.log(`Removed hash ${contentHash.substring(0,8)}... from ongoing requests.`);
      }
  })();

  ongoingRequests.set(contentHash, apiCallPromise);
  console.log(`Added hash ${contentHash.substring(0,8)}... to ongoing requests.`);

  return apiCallPromise;
}

module.exports = {
  summarizeWithGemini,
};