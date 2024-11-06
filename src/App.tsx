// @collapsed
import Groq from "groq-sdk";
import React, { useEffect, useState } from "react";
import {Header} from "./components/Header.tsx";

const App: React.FC = () => {
  const [text, setResult] = useState("")
  const [simplifiedText, setResultSimple] = useState("")
  const [dots, setDots] = useState('');


  const GROK_API_KEY = process.env.REACT_APP_GROQ_API_KEY;

  const groq = new Groq({
    apiKey: GROK_API_KEY,
    dangerouslyAllowBrowser: true,
  });
console.log(simplifiedText);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prevDots) => (prevDots.length < 3 ? prevDots + '.' : ''));
    }, 500); // Adjust speed as needed


    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id as number;


      chrome.scripting.executeScript(
          {
            target: { tabId },
            func: () => {
              const title = window.getSelection()?.toString();
              return title;
            },
          },
          (injectionResults) => {
            if (chrome.runtime.lastError) {
              console.error(
                  "Script injection failed:",
                  chrome.runtime.lastError.message
              );
              return;
            }

            if (injectionResults && injectionResults.length > 0) {
              const pageTitle = injectionResults[0].result as string;
              setResult(pageTitle);
            } else {
              console.error("No result from injected script");
            }
          }
      );
    });
    
    async function getGroqChatCompletion() {
      const results = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: `Explain the meaning of "${text}" in simple terms. Translate it into basic English suitable for someone below B1 proficiency level. Only provide the answer without additional context or introductory phrases.`,
          },
        ],
        model: "llama3-70b-8192",
      });
      const response = results.choices[0].message.content as string;
      //
      setResultSimple(response);
      // setShow(true);

    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id as number;
    
      chrome.scripting.executeScript(
        {
          target: { tabId },
          func: () => {
            const videos = window.document.getElementsByTagName("video");
            const videoElement = videos[0] as HTMLMediaElement;
            console.log(videoElement);
          
            if (videoElement) {
              return videoElement;
            } else {
              console.error("No video element found");
              return null;
            }
          },
        },
        (injectionResults) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Script injection failed:",
              chrome.runtime.lastError.message
            );
            return;
          }
    
          if (injectionResults && injectionResults.length > 0) {
            const videoSrc = injectionResults[0].result;
            if (videoSrc) {
              transcribeSelectedRange(0, 10);
            } else {
              console.error("No video source found");
            }
          } else {
            console.error("No result from injected script");
          }
        }
      );
    });

    async function transcribeSelectedRange(startTime:number, endTime:number) {
      try {
        
        const mediaStream = await navigator.mediaDevices.getDisplayMedia({ audio: true});
    
        // Find the video track in the captured media stream (optional)
        const audioTrack = mediaStream.getAudioTracks()[0];
    
        // Only proceed if an audio track is available
        if (!audioTrack) {
          console.error("No audio track found in the media stream.");
          return;
        }
    
        const mediaRecorder = new MediaRecorder(mediaStream);
        const audioChunks = [] as any[];
    
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
    
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          await transcribeAudio(audioBlob);
        };
    
        // Start recording, then stop after the specified range
        mediaRecorder.start();
        console.log("listeninggggg")
        setTimeout(() => {
          mediaRecorder.stop();
          // Stop the media stream to end screen recording
          mediaStream.getTracks().forEach(track => track.stop());
        }, (endTime - startTime) * 1000);
      } catch (error) {
        console.error("Error accessing display media:", error);
      }
    }
    async function transcribeAudio(audioBlob : Blob) {
      try {
        console.log("Audio is here", audioBlob)
        // Set up FormData to mimic a file upload
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.wav"); // Append the audio blob with a file name
        formData.append("model", "whisper-large-v3"); // Add other required fields
        formData.append("prompt", "Specify context or spelling"); // Optional, as needed
        formData.append("temperature", "0"); // Optional, as needed
        formData.append("response_format", "json"); // Optional, as needed
    
        // Send the form data to the third-party transcription API
        const response = await fetch("https://api.groq.com/openai/v1/audio/translations", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROK_API_KEY}`, // Authorization header
            // No need for 'Content-Type' here, fetch automatically sets the correct boundary for FormData
          },
          body: formData,
        });
        
        const transcriptionResult = await response.json();
        console.log(transcriptionResult.text); // Display transcription result or handle it further
      } catch (error) {
        console.error("Error transcribing audio:", error);
      }
    }
    if (text.trim().length > 3) getGroqChatCompletion();
    return () => clearInterval(interval);

  }, [text])

  return (
    <div className="container mx-auto p-4 w-[500px] rounded-lg">
    <Header />

    <div className="p-2">
      {simplifiedText ? (
        <p className="text-[15px]">{simplifiedText}</p>
      ) : (
        <div className="flex justify-center w-full">
          <span className="text-[100px] invisible">...</span>
          {/* Visible dots for animation */}
          <span className="text-[100px]">{dots}</span>
      </div>
      )}
    </div>
  </div>
  
  );
};

export default App;
